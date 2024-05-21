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
