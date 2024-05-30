const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

app.use(express.static('client'));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});