const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

app.use(express.static('client'));
// Defining the Game class
class Game {
    constructor(gameId) {
        this.gameId = gameId;
        this.totalGames = 0;
        this.gameBoard = Array.from({ length: 10 }, () => Array(10).fill(null));
        this.playerStats = {};
        this.players = {};
        this.maxPlayers = 4;
        this.currentPlayerTurn = null;
        this.actionCounter = 0;
        this.maxActionsPerTurn = 10;
        this.gameEnded = false;
    }
    // Adding a player to the game
    addPlayer(socket, playerName) {
        if (Object.keys(this.players).length >= this.maxPlayers) {
            socket.emit('full');
            socket.disconnect();
            return;
        }

        this.players[socket.id] = { id: socket.id, name: playerName, monsters: [], lostMonsters: 0, eliminated: false };
        this.playerStats[socket.id] = { wins: 0, losses: 0 };

        const playerIndex = Object.keys(this.players).indexOf(socket.id);
        const playerCount = Object.keys(this.players).length;

        if (Object.keys(this.players).length === 1) {
            this.currentPlayerTurn = socket.id;
            this.actionCounter = 0;
        }

        socket.join(this.gameId);
        socket.emit('updateBoard', this.gameBoard);
        socket.emit('updateStats', {
            totalGames: this.totalGames,
            playerWins: this.playerStats[socket.id].wins,
            playerLosses: this.playerStats[socket.id].losses,
        });

        io.to(this.gameId).emit('highlightEdge', { playerIndex, playerCount });
        io.to(this.gameId).emit('turnUpdate', this.players[this.currentPlayerTurn].name);
    }
    //handles the option of placing monster on grid by player 
    placeMonster(socket, { row, col, type }) {
        if (socket.id !== this.currentPlayerTurn || this.gameBoard[row][col]) return;
        if (this.actionCounter >= this.maxActionsPerTurn) return;

        const validPlacement = this.isValidPlacement(socket.id, row, col);
        if (validPlacement) {
            this.gameBoard[row][col] = { type, playerId: socket.id, playerName: this.players[socket.id].name };
            this.players[socket.id].monsters.push({ row, col, type });
            io.to(this.gameId).emit('updateBoard', this.gameBoard);
            this.actionCounter++;
        }
    }

    //handles the option of mopves monster on grid by player
    moveMonster(socket, { fromRow, fromCol, toRow, toCol }) {
        if (socket.id !== this.currentPlayerTurn || !this.gameBoard[fromRow][fromCol]) return;
        if (this.actionCounter >= this.maxActionsPerTurn) return;

        const monster = this.gameBoard[fromRow][fromCol];
        if (monster.playerId === socket.id && this.isValidMove(socket.id, fromRow, fromCol, toRow, toCol)) {
            const destinationMonster = this.gameBoard[toRow][toCol];
            this.gameBoard[fromRow][fromCol] = null;

            if (destinationMonster && destinationMonster.playerId !== socket.id) {
                this.handleCollisions(monster, destinationMonster, toRow, toCol);
            } else {
                this.gameBoard[toRow][toCol] = monster;
                this.players[socket.id].monsters = this.players[socket.id].monsters.map(m => {
                    if (m.row === fromRow && m.col === fromCol) {
                        return { row: toRow, col: toCol, type: m.type };
                    }
                    return m;
                });
            }

            io.to(this.gameId).emit('updateBoard', this.gameBoard);
            this.actionCounter++;
            this.checkGameStatus();
        }
    }

}
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});