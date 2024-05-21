const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();
const PORT = 3000;
const path = require('path');
const WebSocket = require('ws');


const server = http.createServer(app)

const wsServer = new WebSocket.Server( { noServer: true } );

app.use(express.static(path.resolve("")))
app.get("/",(req,res)=>{
    return res.sendFile("index.html")
})

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

