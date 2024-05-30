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
}
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});