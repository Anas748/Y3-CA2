const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
app.use(express.static('client'));
// Defining the Game class
class Game {
    constructor(gameId) {
        this.gameId = gameId; // unique ID for the game
        this.totalGames = 0; // Total number of games played
        this.gameBoard = Array.from({ length: 10 }, () => Array(10).fill(null));
        this.playerStats = {}; // Player statistics
        this.players = {};   // Players in the game
        this.maxPlayers = 4;  // Maximum number of players
        this.currentPlayerTurn = null; // ID of the player whose turn it is
        this.actionCounter = 0; // Counter for actions in the current turn
        this.maxActionsPerTurn = 1; // number of moves to a player in each turn can be chnaged for testing 
        this.gameEnded = false; // Flag to indicate if the game has ended
        console.log(`Game created with ID: ${this.gameId}`);
    }
    // Adding a player to the game
    addPlayer(socket, playerName) {
        lock.acquire(this.gameId, (done) => {
            if (Object.keys(this.players).length >= this.maxPlayers) {
                socket.emit('full');
                socket.disconnect();
                done(); // Release the lock
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
            console.log(`${playerName} joined the game ${this.gameId}`);
            done(); // Release the lock
        });
    }
    //handles the option of placing monster on grid by player 
    placeMonster(socket, { row, col, type }) {
        lock.acquire(this.gameId, (done) => {
            if (socket.id !== this.currentPlayerTurn || this.gameBoard[row][col]) {
                done(); // Release the lock
                return;
            }
            if (this.actionCounter >= this.maxActionsPerTurn) {
                done(); // Release the lock
                return;
            }

            const validPlacement = this.allowedPlacing(socket.id, row, col);
            if (validPlacement) {
                this.gameBoard[row][col] = { type, playerId: socket.id, playerName: this.players[socket.id].name };
                this.players[socket.id].monsters.push({ row, col, type });
                io.to(this.gameId).emit('updateBoard', this.gameBoard);
                console.log(`${this.players[socket.id].name} placed a monster at (${row}, ${col})`);
                this.actionCounter++;
            }
            done(); // Release the lock
        });
    }

    //handles the option of mopves monster on grid by player
    moveMonster(socket, { fromRow, fromCol, toRow, toCol }) {
        lock.acquire(this.gameId, (done) => {
        if (socket.id !== this.currentPlayerTurn || !this.gameBoard[fromRow][fromCol]) {
            done();
           return;} 
        if (this.actionCounter >= this.maxActionsPerTurn){
             done();
            return;} 

        const monster = this.gameBoard[fromRow][fromCol];
        if (monster.playerId === socket.id && this.allowedMove(socket.id, fromRow, fromCol, toRow, toCol)) {
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
        done(); // Release the lock
    });
    }
    // Method to handle ending a player's turn
    endTurn(socket) {
        lock.acquire(this.gameId, (done) => {
            if (socket.id !== this.currentPlayerTurn) {
                done(); // Release the lock
                return;
            }
            console.log(`Turn ended by ${this.players[socket.id].name}`);
            this.nextTurn();
            done(); // Release the lock
        });
    }
    // Method to remove a player from the game
    removePlayer(socket) {
        lock.acquire(this.gameId, (done) => {
            if (this.players[socket.id]) {
                // Remove player's monsters from the game board
                this.players[socket.id].monsters.forEach(monster => {
                    this.gameBoard[monster.row][monster.col] = null;
                });

                io.to(this.gameId).emit('playerDisconnected', this.players[socket.id].name);
                console.log(`${this.players[socket.id].name} left the game ${this.gameId}`);
                // Mark player as eliminated
                this.players[socket.id].eliminated = true;

                // Only check the game status after marking the player as eliminated
                this.checkGameStatus();

                // Remove player from the game
                delete this.players[socket.id];
                delete this.playerStats[socket.id];
            }

            io.to(this.gameId).emit('updateBoard', this.gameBoard);
            done(); // Release the lock
        });
    }
     // Method to check if placing a monster is allowed
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
     // Method to check if moving a monster is allowed
    allowedMove(playerId, fromRow, fromCol, toRow, toCol) {
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
     // Method to check the status of the game
    checkGameStatus() {
        lock.acquire(this.gameId, (done) => {
            Object.keys(this.players).forEach(playerId => {
                if ((this.players[playerId].lostMonsters >= 2 || this.players[playerId].monsters.length === 0) && !this.players[playerId].eliminated) {
                    this.players[playerId].eliminated = true;
                    io.to(this.gameId).emit('playerEliminated', this.players[playerId].name);
                }
            });

            const remainingPlayers = Object.keys(this.players).filter(playerId => !this.players[playerId].eliminated);

            if (remainingPlayers.length === 10 && !this.gameEnded) {
                const winnerId = remainingPlayers[0];
                this.gameEnded = true;
                this.playerStats[winnerId].wins++;
                this.totalGames++;
                io.to(this.gameId).emit('gameOver', this.players[winnerId].name);
                console.log(`${this.players[winnerId].name} has won the game ${this.gameId}`);
                lock.acquire(this.gameId, (done) => {
                    this.nextRound(winnerId);
                   done(); // Release the lock after resetGame is complete
                });
            }
            done(); // Release the lock
        });
    }
     // Method to handle the next player's turn
    nextTurn() {
        lock.acquire(this.gameId, (done) => {
            const playerIds = Object.keys(this.players);
            const currentIndex = playerIds.indexOf(this.currentPlayerTurn);
            let nextIndex = (currentIndex + 1) % playerIds.length;

            // Skip eliminated players
            while (this.players[playerIds[nextIndex]] && this.players[playerIds[nextIndex]].eliminated) {
                nextIndex = (nextIndex + 1) % playerIds.length;
            }

            this.currentPlayerTurn = playerIds[nextIndex];
            this.actionCounter = 0;
            io.to(this.gameId).emit('turnUpdate', this.players[this.currentPlayerTurn].name);
            console.log(`It's now ${this.players[this.currentPlayerTurn].name}'s turn`);
            done(); // Release the lock
        });
    }
     // Method to handle the next round after a game ends
    nextRound(winnerId) {
        Object.keys(this.players).forEach(playerId => {
            if (playerId !== winnerId) {
                this.playerStats[playerId].losses++;
            }
        });

        this.gameBoard = Array.from({ length: 10 }, () => Array(10).fill(null));
        Object.keys(this.players).forEach(playerId => {
            this.players[playerId].monsters = [];
            this.players[playerId].lostMonsters = 0;
            this.players[playerId].eliminated = false;
        });

        this.currentPlayerTurn =  winnerId;
        this.actionCounter = 0;
        this.gameEnded = false;
        io.to(this.gameId).emit('updateBoard', this.gameBoard);
        io.to(this.gameId).emit('turnUpdate', this.players[this.currentPlayerTurn].name);

        Object.keys(this.players).forEach(playerId => {
            io.to(playerId).emit('updateStats', {
                totalGames: this.totalGames,
                playerWins: this.playerStats[playerId].wins,
                playerLosses: this.playerStats[playerId].losses,
            });
        });
    }

}



// Create an object to hold all games
const games = {};
let gameIdCounter = 0;

io.on('connection', (socket) => {
    socket.on('joinGame', (playerName) => {
        let gameId = null;
        // Find an existing game with available slots
        for (const id in games) {
            if (Object.keys(games[id].players).length < games[id].maxPlayers && !games[id].gameEnded) {
                gameId = id;
                break;
            }
        }
         // If no existing game is found, create a new one
        if (!gameId) {
            gameId = `game_${gameIdCounter++}`;
            games[gameId] = new Game(gameId);
        }
         // Add the player to the game
        games[gameId].addPlayer(socket, playerName);

        socket.on('getStats', () => {
            if (games[gameId].playerStats[socket.id]) {
                socket.emit('updateStats', {
                    totalGames: games[gameId].totalGames,
                    playerWins: games[gameId].playerStats[socket.id].wins,
                    playerLosses: games[gameId].playerStats[socket.id].losses,
                });
            }
        });

        socket.on('placeMonster', (data) => {
            games[gameId].placeMonster(socket, data);
        });

        socket.on('moveMonster', (data) => {
            games[gameId].moveMonster(socket, data);
        });

        socket.on('endTurn', () => {
            games[gameId].endTurn(socket);
        });

        socket.on('disconnect', () => {
            games[gameId].removePlayer(socket);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});