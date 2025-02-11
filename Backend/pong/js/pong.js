const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

const clients = new Set();

fastify.register(async function (fastify) {
    fastify.get("/ws/pong", { websocket: true }, (connection, req) => {
        clients.add(connection);
        console.log("Nouvelle connexion WebSocket !");

        let gameState = {
            ball: { x: 500, y: 250 },
            paddles: { player1: { y: 200 }, player2: { y: 200 } },
            score: { player1: 0, player2: 0 }
        };
        let ballSpeedX = 4;
        let ballSpeedY = 4;
        let speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
        const arena_height = 500;
        const arena_width = 1000;
        const move = 10;
        const paddleWidth = 20;
        const paddleHeight = 100;
        const ballRadius = 10;
        let game = 0;

        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            console.log("Message reçu :", data);

            if (data.player === "player1") {
                if (data.move === "up" && gameState.paddles.player1.y > 0)
                    gameState.paddles.player1.y -= move;
                else if (data.move === "down" && gameState.paddles.player1.y < arena_height - paddleHeight)
                    gameState.paddles.player1.y += move;
            }
            if (data.player === "player2") {
                if (data.move === "up" && gameState.paddles.player2.y > 0)
                    gameState.paddles.player2.y -= move;
                else if (data.move === "down" && gameState.paddles.player2.y < arena_height - paddleHeight)
                    gameState.paddles.player2.y += move;
            }

            if (data.game === "new")
                game = 1;
            
            clients.forEach(client => {
                    client.socket.send(JSON.stringify({ gameState }));
                });
            });
        
        connection.socket.on("close", () => {
            clients.delete(connection);
            console.log("Connexion WebSocket fermée.");
        });
        
        function update() {
            gameState.ball.x += ballSpeedX;
            gameState.ball.y += ballSpeedY;
    
            if (gameState.ball.y + ballRadius > arena_height || gameState.ball.y - ballRadius < 0)
                ballSpeedY = -ballSpeedY;
            if (gameState.ball.x - ballRadius < paddleWidth && gameState.ball.y > gameState.paddles.player1.y && gameState.ball.y < gameState.paddles.player1.y + paddleHeight) {
                ballSpeedX = -ballSpeedX * 1.1;
                if (ballSpeedX > 15)
                    ballSpeedX = 15;
            }  
            if (gameState.ball.x + ballRadius > arena_width - paddleWidth && gameState.ball.y > gameState.paddles.player2.y && gameState.ball.y < gameState.paddles.player2.y + paddleHeight) {
                ballSpeedX = -ballSpeedX * 1.1 ;
                if (ballSpeedX < -15)
                    ballSpeedX = -15;
            }
            if (gameState.ball.x - ballRadius < 0) {
                gameState.score.player2++;
                resetBall();
            }
            if (gameState.ball.x + ballRadius > arena_width) {
                gameState.score.player1++;
                resetBall();
            }
        }

        function resetBall() {
            gameState.ball.x = arena_width / 2;
            gameState.ball.y = arena_height / 2;
            speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
            let angle;
            if (Math.random() < 0.5) {
                angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
            }
            else {
                angle = Math.random() * (Math.PI / 2) + (3 * Math.PI) / 4;
            }
            ballSpeedX = speed * Math.cos(angle);
            ballSpeedY = speed * Math.sin(angle);
        }

        function new_game() {
            game = 1;
            gameState.score.player1 = 0;
            gameState.score.player2 = 0;
            ballSpeedX = 4;
            ballSpeedY = 4;
            speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
            resetBall();
        }

        function check_score() {
            if (gameState.score.player1 == 3 || gameState.score.player2 == 3)
              game = 0;
        }

        function gameLoop() {
            if (game == 1) {
              update();
              check_score();
            }
        }
        setInterval(gameLoop, 30);
    });
});

const start = async () => {
    try {
        await fastify.listen({ port: 4000, host: "0.0.0.0" });
        console.log("🎮 Pong WebSocket Server running on port 4000");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();