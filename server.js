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

        const validPlacement = this.allowedPlacing(socket.id, row, col);
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
        if (monster.playerId === socket.id && this.allowdMove(socket.id, fromRow, fromCol, toRow, toCol)) {
            const destinationMonster = this.gameBoard[toRow][toCol];
            this.gameBoard[fromRow][fromCol] = null;

            if (destinationMonster && destinationMonster.playerId !== socket.id) {
                this.killMon(monster, destinationMonster, toRow, toCol);
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
    endTurn(socket) {
        if (socket.id !== this.currentPlayerTurn) return;
        this.updateTurnOrder();
    }
    removePlayer(socket) {
        if (this.players[socket.id]) {
            // Remove player's monsters from the game board
            this.players[socket.id].monsters.forEach(monster => {
                this.gameBoard[monster.row][monster.col] = null;
            });

            io.to(this.gameId).emit('playerDisconnected', this.players[socket.id].name);

            // Mark player as eliminated
            this.players[socket.id].eliminated = true;

            // Only check the game status after marking the player as eliminated
            this.checkGameStatus();

            // Remove player from the game
            delete this.players[socket.id];
            delete this.playerStats[socket.id];
        }

        io.to(this.gameId).emit('updateBoard', this.gameBoard);
    }
    allowedPlacing(playerId, row, col) {
        const playerCount = Object.keys(this.players).length;
        const playerIndex = Object.keys(this.players).indexOf(playerId);

        if (playerCount === 4) {
            if (playerIndex === 0) return row === 0;
            if (playerIndex === 1) return row === 9;
            if (playerIndex === 2) return col === 9;
            if (playerIndex === 3) return col === 0;
        } else if (playerCount === 3) {
            if (playerIndex === 0) return row === 0;
            if (playerIndex === 1) return row === 9;
            if (playerIndex === 2) return col === 9;
        } else if (playerCount === 2) {
            if (playerIndex === 0) return row === 0;
            if (playerIndex === 1) return row === 9;
        } else {
            if (playerIndex === 0) return row === 0;
        }

        return false;
    }

    allowdMove(playerId, fromRow, fromCol, toRow, toCol) {
        const deltaRow = Math.abs(toRow - fromRow);
        const deltaCol = Math.abs(toCol - fromCol);

        if (deltaRow === 0 || deltaCol === 0) {
            return this.gameBoard[toRow][toCol] === null || this.gameBoard[toRow][toCol].playerId !== playerId;
        }

        if (deltaRow === deltaCol && deltaRow === 2) {
            return this.gameBoard[toRow][toCol] === null || this.gameBoard[toRow][toCol].playerId !== playerId;
        }

        return false;
    }
    //logic for kill of monsters 
    killMon(monster, otherMonster, row, col) {
        let survivor = null;

        if (monster.type === 'vampire' && otherMonster.type === 'werewolf') {
            survivor = monster;
        } else if (monster.type === 'werewolf' && otherMonster.type === 'ghost') {
            survivor = monster;
        } else if (monster.type === 'ghost' && otherMonster.type === 'vampire') {
            survivor = monster;
        } else if (monster.type === otherMonster.type) {
            survivor = null;
        } else {
            survivor = otherMonster;
        }

        this.gameBoard[row][col] = survivor;

        if (survivor) {
            this.players[survivor.playerId].monsters = this.players[survivor.playerId].monsters.map(m => {
                if (m.row === survivor.row && m.col === survivor.col) {
                    return { row, col, type: survivor.type };
                }
                return m;
            });
            this.players[monster.playerId].monsters = this.players[monster.playerId].monsters.filter(m => m.row !== monster.row || m.col !== monster.col);
            this.players[otherMonster.playerId].monsters = this.players[otherMonster.playerId].monsters.filter(m => m.row !== otherMonster.row || m.col !== otherMonster.col);
            this.players[otherMonster.playerId].lostMonsters++;
        } else {
            this.players[monster.playerId].monsters = this.players[monster.playerId].monsters.filter(m => m.row !== monster.row || m.col !== monster.col);
            this.players[otherMonster.playerId].monsters = this.players[otherMonster.playerId].monsters.filter(m => m.row !== otherMonster.row || m.col !== otherMonster.col);
            this.players[monster.playerId].lostMonsters++;
            this.players[otherMonster.playerId].lostMonsters++;
        }

        this.checkGameStatus();
    }
    checkGameStatus() {
        // Eliminate players based on game rules
        Object.keys(this.players).forEach(playerId => {
            if ((this.players[playerId].lostMonsters >= 2 || this.players[playerId].monsters.length === 0) && !this.players[playerId].eliminated) {
                this.players[playerId].eliminated = true;
                io.to(this.gameId).emit('playerEliminated', this.players[playerId].name);
            }
        });
    
        // Filter out eliminated players
        const remainingPlayers = Object.keys(this.players).filter(playerId => !this.players[playerId].eliminated);
    
        // Check if there is only one player left
        if (remainingPlayers.length === 1 && !this.gameEnded) {
            const winnerId = remainingPlayers[0];
            this.gameEnded = true;
            this.playerStats[winnerId].wins++;
            this.totalGames++;
            io.to(this.gameId).emit('gameOver', this.players[winnerId].name);
            setTimeout(() => this.resetGame(winnerId), 1000);
        }
    }

}
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});