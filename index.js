const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();
const PORT = 3000;
const path = require('path');
const WebSocket = require('ws');


const server = http.createServer(app);

const wsServer = new WebSocket.Server({ server });
const MAX_PLAYERS = 4; //MAx Player in a game is 4 
let games = [{ id: 1, players: [] }]; // Initialize with one game

app.use(express.static(path.resolve("")));
app.get("/", (req, res) => {
    return res.sendFile("index.html");
});
app.use(bodyParser.json());
app.post('/join', (req, res) => {
    const playerName = req.body.name;

    if (!playerName) {
        return res.json({ success: false, alert: 'Name is required' });
    }

    // Find the last game
    let currentGame = games[games.length - 1];

    // Check if the current game has reached the maximum number of players
    if (currentGame.players.length >= MAX_PLAYERS) {
        // Create a new game if the current game is full
        currentGame = { id: games.length + 1, players: [] };
        games.push(currentGame);
    }

    // Add the player to the current game
    currentGame.players.push({
        name: playerName,
        wins: 0,
        losses: 0,
        monsters: { vampire: 4, werewolf: 4, ghost: 4 }
    });
    res.json({ success: true, gameId: currentGame.id, player: playerName });
    // Broadcast to all connected clients
    broadcastGameState(currentGame);
});
app.get('/games/:gameId', (req, res) => {
    const gameId = parseInt(req.params.gameId, 10);
    const game = games.find(g => g.id === gameId);

    if (game) {
        res.json(game);
    } else {
        res.status(404).json({ message: 'Game not found' });
    }
});

wsServer.on('connection', ws => {
    ws.on('message', message => {
        // Handle incoming messages from clients if needed
    });

    // Send current game state to newly connected client
    ws.send(JSON.stringify(games[games.length - 1]));
});

function broadcastGameState(game) {
    wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(game));
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

