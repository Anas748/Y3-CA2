//Setting up the initial DOM content load and socket connection
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    const socket = io();

    // DOM elements for game stats and controls
    const totalGamesElement = document.getElementById('total-games');
    const playerWinsElement = document.getElementById('player-wins');
    const playerLossesElement = document.getElementById('player-losses');
    const gameBoardElement = document.getElementById('game-board');
    const placeVampireButton = document.getElementById('place-vampire');
    const placeWerewolfButton = document.getElementById('place-werewolf');
    const placeGhostButton = document.getElementById('place-ghost');
    const endTurnButton = document.getElementById('end-turn');
    const usernameInput = document.getElementById('username');
    const joinGameButton = document.getElementById('join-game');
    const currentTurnElement = document.getElementById('current-turn');
    const instructionsElement = document.getElementById('instructions');

    // Variables to keep track of game state
    let selectedMonster = null;
    let currentPlayerTurn = null;
    let playerName = '';
    let selectedCell = null;
    let playerIndex = -1;
    let playerCount = 0;
    const playerColors = ['edge-highlight-1', 'edge-highlight-2', 'edge-highlight-3', 'edge-highlight-4'];

    // Initialize the game board
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            // Check if a monster type is selected for placing
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => {
                if (selectedMonster) {
                    socket.emit('placeMonster', { row: i, col: j, type: selectedMonster });
                    selectedMonster = null;
                    clearHighlights();
                    updateInstructions();
                } else if (selectedCell) {   // Check if a cell is selected for moving a monster
                    socket.emit('moveMonster', {
                        fromRow: selectedCell.dataset.row,
                        fromCol: selectedCell.dataset.col,
                        toRow: i,
                        toCol: j
                    });
                    selectedCell = null; // Reset selectedCell after moving
                    clearHighlights();
                    updateInstructions();
                } else if (cell.textContent) { // If the cell has a monster, select it
                    selectedCell = cell;
                    highlightValidMoves(i, j);
                    updateInstructions();
                } else {
                    selectedCell = null;// Reset selectedCell if clicking on an empty cell
                    clearHighlights();
                }
            });
            gameBoardElement.appendChild(cell);
        }
    }

    // Event listeners for buttons
    placeVampireButton.addEventListener('click', () => {
        selectedMonster = 'vampire';
        highlightValidPlacements();
        updateInstructions();
    });
    placeWerewolfButton.addEventListener('click', () => {
        selectedMonster = 'werewolf';
        highlightValidPlacements();
        updateInstructions();
    });
    placeGhostButton.addEventListener('click', () => {
        selectedMonster = 'ghost';
        highlightValidPlacements();
        updateInstructions();
    });
    endTurnButton.addEventListener('click', () => {
        socket.emit('endTurn');
        selectedCell = null;// Reset selectedCell at the end of turn
        selectedMonster = null;// Reset selectedMonster at the end of turn
        clearHighlights();
        updateInstructions();
    });

    joinGameButton.addEventListener('click', () => {
        playerName = usernameInput.value.trim();
        if (playerName) {
            socket.emit('joinGame', playerName);
            usernameInput.disabled = true;// Disable username input and join button after joining the game
            joinGameButton.disabled = true;
            placeVampireButton.disabled = false;
            placeWerewolfButton.disabled = false;
            placeGhostButton.disabled = false;
            endTurnButton.disabled = false;
        }
    });




    function clearHighlights() {
        document.querySelectorAll('.highlight').forEach(cell => {
            cell.classList.remove('highlight');
        });
    }
    function updateInstructions() {
        if (selectedMonster) {
            instructionsElement.textContent = `Placing ${selectedMonster}. Click on a cell on your edge to place it.`;
        } else if (selectedCell) {
            instructionsElement.textContent = `Selected monster. Click on a cell to move it.`;
        } else {
            instructionsElement.textContent = `Select a monster to place or move.`;
        }
    }

});