const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

let i = 0;

const clients = new Set();

const clientsWaiting = new Set();

let playerReady = new Set();

let waitingClient = {}

let waiting_room = [];

let players = {}

let gameState = {
    ball: { x: 500, y: 250 },
    paddles: { player1: { name: "C", y: 200 }, player2: { name: "B", y: 200 } },
    score: { player1: 0, player2: 0 },
    game: { state: 0 }
};
let ballSpeedX = 0.8;
let ballSpeedY = 0.8;
let move = 5;
let speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
const arena_height = 500;
const arena_width = 1000;
const paddleWidth = 20;
const paddleHeight = 100;
const ballRadius = 10;

let moving = { player1: { up: false, down: false }, player2: { up: false, down: false } };

fastify.register(async function (fastify) {
    fastify.get("/ws/pong/waiting", { websocket: true }, (connection, req) => { 
        clientsWaiting.add(connection);
        console.log("Nouvelle connexion WebSocket sur Waiting !");
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (i == 0) {
                waitingClient[0] = data.username;
                gameState.paddles.player1.name = data.username;
                i++;
            } else if (i == 1) {
                waitingClient[1] = data.username;
                gameState.paddles.player2.name = data.username;
                i++;
            }
            // console.log("waitingClient.length: ");
            // console.log(waitingClient.length);
            console.log("i: ", i);
            if (i == 2) {
                i = 0;
                clientsWaiting.forEach(clientsWaiting => {
                    i++;
                    clientsWaiting.socket.send(JSON.stringify({ success: true, player1: gameState.paddles.player1.name, player2: gameState.paddles.player2.name, player_id: i }));
                });
                clientsWaiting.clear();
                waitingClient = {};
                i = 0;
            }
        });
    })
    fastify.get("/ws/pong", { websocket: true }, (connection, req) => {
        clients.add(connection);
        console.log("Nouvelle connexion WebSocket !");
        
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (data.username1 && data.username2) {
                console.log(`user1: ${data.username1}\n user2: ${data.username2}`);
                gameState.paddles.player1.name = data.username1;
                gameState.paddles.player2.name = data.username2;
            }
            if (data.player == 1) {
                if (data.move === "up") {
                    moving.player1.up = true;
                    moving.player1.down = false;
                } else if (data.move === "down") {
                    moving.player1.down = true;
                    moving.player1.up = false;
                } else if (data.move === "stop") {
                    moving.player1.up = false;
                    moving.player1.down = false;
                }
            }
            if (data.player == 2) {
                if (data.move === "up") {
                    moving.player2.up = true;
                    moving.player2.down = false;
                } else if (data.move === "down") {
                    moving.player2.down = true;
                    moving.player2.up = false;
                } else if (data.move === "stop") {
                    moving.player2.up = false;
                    moving.player2.down = false;
                }
            }
            // if (data.game === "new") {
            //     playerReady.add(data.player);
            //     if (playerReady.size == 2) {
            //         console.log("🎮 Les deux joueurs sont prêts, démarrage du jeu !");
            //         new_game();
            //     }
            // }
        });
        
        connection.socket.on("close", () => {
            clients.delete(connection);
            playerReady.clear();
            console.log("Connexion WebSocket fermée.");
        });
        
        function update() {
            if (moving.player1.up && gameState.paddles.player1.y > 0) {
                gameState.paddles.player1.y -= move;
            }
            if (moving.player1.down && gameState.paddles.player1.y < arena_height - paddleHeight) {
                gameState.paddles.player1.y += move;
            }
            if (moving.player2.up && gameState.paddles.player2.y > 0) {
                gameState.paddles.player2.y -= move;
            }
            if (moving.player2.down && gameState.paddles.player2.y < arena_height - paddleHeight) {
                gameState.paddles.player2.y += move;
            }

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
                ballSpeedX = -ballSpeedX * 1.1;
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
            ballSpeedX /= 2;
            if (ballSpeedX < 0.8)
                ballSpeedX = 0.8;
            ballSpeedY /= 2;
            if (ballSpeedY < 0.8)
                ballSpeedY = 0.8;
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

        // function new_game() {
        //     gameState.game.state = 1;
        //     gameState.score.player1 = 0;
        //     gameState.score.player2 = 0;
        //     ballSpeedX = 1.6;
        //     ballSpeedY = 1.6;
        //     move = 5;
        //     resetBall();
        // }

        // function check_score() {
        //     if (gameState.score.player1 == 3 || gameState.score.player2 == 3)
        //         gameState.game.state = 0;
        // }

        function gameLoop() {
            // if (gameState.game.state == 1) {
              update();
            //   check_score();
              clients.forEach(client => {
                  client.socket.send(JSON.stringify({ gameState }));
              });
        //   }
        }
        setInterval(gameLoop, 16);
    });
});

fastify.post("/waiting_room", async (req, reply) => {
    const {username} = req.body;
    if (!username) {
        return reply.code(200).send({ success: false, error: "Username manquant" });
    } if (waiting_room.includes(username) && waiting_room.length == 2) {
        const username1 = waiting_room[0];
        const username2 = waiting_room[1];
        waiting_room.splice(0, waiting_room.length);
        return reply.code(200).send({ success: true, "username1": username1, "username2": username2 });
    } else {
        if (!waiting_room.includes(username))
            waiting_room.push(username);
        if (waiting_room.length < 2) {
            return reply.code(200).send({ success: true, message: "Match not ready" });
        } else {
            const username1 = waiting_room[0];
            const username2 = waiting_room[1];
            console.log(`username1::::: ${username1} username2 :::::: ${username2}`);
            for (let i = 0; waiting_room.length > i; i++) {
                console.log(`user:::: ${waiting_room[i]}`);
            }
            return reply.code(200).send({ success: true, "username1": username1, "username2": username2 });
        }
    }
})

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