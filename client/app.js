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
});