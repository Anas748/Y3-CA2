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