// Establish WebSocket connection
const ws = new WebSocket(`ws://localhost:3000`);

// Listen for messages from the server
ws.onmessage = event => {
    const gameState = JSON.parse(event.data);
    updateGameUI(gameState);
};

function updateGameUI(gameState) {
    // Update the UI with the current game state
    gameState.players.forEach((player, index) => {
        document.getElementById(`player${index + 1}-name`).innerText = player.name;
        document.getElementById(`player${index + 1}-stats`).innerText = `Wins: ${player.wins}, Losses: ${player.losses}`;
        // Update other UI elements as needed
    });
}

// Function to generate a 10x10 grid
function generateGrid() {
    const grid = document.getElementById('game-grid');
    
    for (let i = 0; i < 10; i++) {
        const row = document.createElement('tr');
        
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('td');
            cell.classList.add('grid-cell');
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);
            row.appendChild(cell);
        }
        
        grid.appendChild(row);
    }
}

// Call the function to generate the grid when the page loads
window.onload = generateGrid;
