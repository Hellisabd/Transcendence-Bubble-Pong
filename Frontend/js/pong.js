console.log("game.js chargé");

function initializeGame() {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("pongCanvas");
	console.log("Canvas trouvé :", canvas);
    if (canvas) {
        const canvas = document.getElementById("pongCanvas");
        const ctx = canvas.getContext("2d");

        const socket = new WebSocket("ws://localhost:4000/ws/pong/");

        const paddleWidth = 20;
        const paddleHeight = 100;
        const ballRadius = 10;

        let gameState = {
            ball: { x: 500, y: 250 },
            paddles: {
                player1: { y: 200 },
                player2: { y: 200 }
            },
            score: { player1: 0, player2: 0 }
        };

        socket.onmessage = function(event) {
            gameState = JSON.parse(event.data);
            // console.log(event.data);
            drawGame();
        };

        // Envoie les commandes au serveur
        document.addEventListener("keydown", function(event) {
            if (event.key === "ArrowUp") socket.send(JSON.stringify({ player: "player2", move: "up" }));
            if (event.key === "ArrowDown") socket.send(JSON.stringify({ player: "player2", move: "down" }));
            if (event.key === "w") socket.send(JSON.stringify({ player: "player1", move: "up" }));
            if (event.key === "s") socket.send(JSON.stringify({ player: "player1", move: "down" }));
        });

        function drawGame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#ffc800";
            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#810000";
            ctx.fillRect(0, gameState.paddles.player1.y, paddleWidth, paddleHeight);
            ctx.fillStyle = "#00009c";
            ctx.fillRect(canvas.width - paddleWidth, gameState.paddles.player2.y, paddleWidth, paddleHeight);

            draw_score()
        }

        function draw_score() {
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = "40px Arial";
            ctx.fillStyle = "#810000";
            ctx.fillText(gameState.score.player1, canvas.width / 2 - 50, 40);
            ctx.fillStyle = "#00009c";
            ctx.fillText(gameState.score.player2, canvas.width / 2 + 50, 40);
        }

        // Boucle de rendu
        setInterval(drawGame, 1000 / 60);
        } 
        else {
        console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}
