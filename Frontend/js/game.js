console.log("game.js chargé");

function initializeGame() {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("pongCanvas");
	console.log("Canvas trouvé :", canvas);
    if (canvas) {
        const ctx = canvas.getContext("2d");
        const socket = new WebSocket("wss://transcendence:8000/ws/pong");
        socket.onopen = function() {
            console.log("✅ WebSocket connectée !");};
        socket.onerror = function(event) {
            console.error("❌ WebSocket erreur :", event);};
        socket.onclose = function(event) {
            console.warn("⚠️ WebSocket fermée :", event);};
        
        const paddleWidth = 20;
        const paddleHeight = 100;
        const ballRadius = 10;

        let gameState = {
            ball: { x: 500, y: 250 },
            paddles: {
                player1: { y: 200 },
                player2: { y: 200 }
            },
            score: { player1: 0, player2: 0 },
            game: { state: 0 }
        };

        socket.onmessage = function(event) {
            let gs = JSON.parse(event.data);
            gameState = gs.gameState;
            drawGame();
        };

        document.addEventListener("keydown", function(event) {
            if (socket.readyState === WebSocket.OPEN) {
                let message = null;
        
                if (event.key === "ArrowUp")
                    message = { player: "player2", move: "up" };
                if (event.key === "ArrowDown")
                    message = { player: "player2", move: "down" };
                if (event.key === "w")
                    message = { player: "player1", move: "up" };
                if (event.key === "s")
                    message = { player: "player1", move: "down" };
                if (event.key === " ") {
                    message = { game: "new" };
                    gameState.game.state = 1;
                }

                if (message) {
                    socket.send(JSON.stringify(message));
                }
            }
        });

        document.addEventListener("keyup", function(event) {
            if (socket.readyState === WebSocket.OPEN) {
                let message = null;

                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    message = { player: "player2", move: "stop" };
                }
                if (event.key === "w" || event.key === "s") {
                    message = { player: "player1", move: "stop" };
                }

                if (message) {
                    socket.send(JSON.stringify(message));
                }
            }
        });        

        function drawGame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFF00";
            ctx.fill();

            ctx.fillStyle = "#810000";
            ctx.fillRect(0, gameState.paddles.player1.y, paddleWidth, paddleHeight);
            ctx.fillStyle = "#00009c";
            ctx.fillRect(canvas.width - paddleWidth, gameState.paddles.player2.y, paddleWidth, paddleHeight);

            draw_score();
            if (gameState.game.state == 0) {
                ctx.font = "30px Arial";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
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

        setInterval(drawGame, 16);
        } 
        else {
            console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}
