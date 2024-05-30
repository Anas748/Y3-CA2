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

}
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});