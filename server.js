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
    socket.on('placeMonster', ({ row, col, type }) => {
        if (socket.id !== currentPlayerTurn || gameBoard[row][col]) return;

        const validPlacement = isValidPlacement(socket.id, row, col);
        if (validPlacement) {
            gameBoard[row][col] = { type, playerId: socket.id, playerName: players[socket.id].name };
            players[socket.id].monsters.push({ row, col, type });
            io.emit('updateBoard', gameBoard);
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


function isValidPlacement(playerId, row, col) {
    const playerCount = Object.keys(players).length;
    const playerIndex = Object.keys(players).indexOf(playerId);

    // Determine the valid placement area for each player
    if (playerCount === 4) {
        // For 4 players, divide the board into 4 edges
        if (playerIndex === 0) return row === 0;            // Player 1: Top edge
        if (playerIndex === 1) return col === 9;            // Player 2: Right edge
        if (playerIndex === 2) return row === 9;            // Player 3: Bottom edge
        if (playerIndex === 3) return col === 0;            // Player 4: Left edge
    } else if (playerCount === 3) {
        // For 3 players, divide the board into 3 edges
        if (playerIndex === 0) return row === 0;            // Player 1: Top edge
        if (playerIndex === 1) return col === 9;            // Player 2: Right edge
        if (playerIndex === 2) return row === 9;            // Player 3: Bottom edge
    } else if (playerCount === 2) {
        // For 2 players, divide the board into 2 edges
        if (playerIndex === 0) return row === 0;            // Player 1: Top edge
        if (playerIndex === 1) return row === 9;            // Player 2: Bottom edge
    } else {
        // For 1 player, they can place anywhere (for testing)
        return true;
    }

    return false;
}