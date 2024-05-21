const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();
const PORT = 3000;
const path = require('path');
const WebSocket = require('ws');


const server = http.createServer(app);

const wsServer = new WebSocket.Server();
const MAX_PLAYERS = 4; //MAx Player in a game is 4 
let players = []; // Array to keep track of players

app.use(express.static(path.resolve("")));
app.get("/",(req,res)=>{
    return res.sendFile("index.html");
});
app.use(bodyParser.json());
app.post('/join', (req, res) => {
    const playerName = req.body.name;
   
    if (!playerName || playerName=="") {
        return res.json({ success: false, message: 'Name is required' });
    }
    // Add the player to the array
    players.push(playerName);
    res.json({ success: true, player: playerName });
    
});











server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

