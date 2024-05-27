const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('client'));

let totalGames = 0;
let gameBoard = Array.from({ length: 10 }, () => Array(10).fill(null));
const playerStats = {};
const players = {};
const maxPlayers = 4;
let currentPlayerTurn = null;

io.on('connection', (socket) => {
    socket.on('joinGame', (playerName) => {
        if (Object.keys(players).length >= maxPlayers) {
            socket.emit('full');
            socket.disconnect();
            return;
        }

    });


        socket.on('disconnect', () => {
            if (players[socket.id]) {
                delete players[socket.id];
            }
    
            if (Object.keys(players).length === 0) {
                gameBoard = Array.from({ length: 10 }, () => Array(10).fill(null));
                totalGames++;
            } else if (currentPlayerTurn === socket.id) {
                updateTurnOrder();
            }
    
            io.emit('updateBoard', gameBoard);
    });
});        