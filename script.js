document.getElementById('joinForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const playerName = document.getElementById('playerName').value;
    fetch('/join', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: playerName })
    })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                window.location.href = `/game.html?gameId=${data.gameId}`;
            } else {
                alert('Error joining the game.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
    });
});