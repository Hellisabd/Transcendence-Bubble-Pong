const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

let i = 0;

let lobbies = {};

const clients = new Set();

const clientsWaiting = new Set();

// let playerReady = new Set();

let waitingClient = {}

let waiting_room = [];

let players = {}

let move = 5;
const arena_height = 500;
const arena_width = 1000;
const paddleWidth = 20;
const paddleHeight = 100;
const ballRadius = 10;


fastify.register(async function (fastify) {
    let username1 = 0;
    let username2 = 0;
    fastify.get("/ws/pong/waiting", { websocket: true }, (connection, req) => { 
        clientsWaiting.add(connection);
        console.log("Nouvelle connexion WebSocket sur Waiting !");
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (i == 0) {
                waitingClient[0] = data.username;
                username1 = data.username;
                i++;
            } else if (i == 1) {
                waitingClient[1] = data.username;
                username2 = data.username;
                i++;
            }
            // console.log("waitingClient.length: ");
            // console.log(waitingClient.length);
            if (i == 2) {
                i = 0;
                const lobbyKey = `${username1}${username2}`;
                console.log("lobby: ", lobbyKey);
                lobbies[lobbyKey] = {
                    players: [],
                    gameState: {
                        ball: { x: 500, y: 250 },
                        paddles: { player1: { name: username1, y: 200 }, player2: { name: username2, y: 200 } },
                        score: { player1: 0, player2: 0 },
                        game: { player1: 0, player2: 0 },
                        moving: { player1: { up: false, down: false }, player2: { up: false, down: false } },
                        ballSpeed: {ballSpeedX: 1.6, ballSpeedY: 1.6},
                        speed: Math.sqrt(1.6 * 1.6 + 1.6 * 1.6),
                        playerReady: {player1: false, player2: false},
                        gameinterval: null
                    }
                }
                clientsWaiting.forEach(clientsWaiting => {
                    i++;
                    clientsWaiting.socket.send(JSON.stringify({ 
                        success: true,
                        player1: lobbies[lobbyKey].gameState.paddles.player1.name,
                        player2: lobbies[lobbyKey].gameState.paddles.player2.name,
                        player_id: i,
                        "lobbyKey": lobbyKey
                    }));
                });
                clientsWaiting.clear();
                waitingClient = {};
                i = 0;
            }
        });
    })
    fastify.get("/ws/pong", { websocket: true }, (connection, req) => {
        console.log("Nouvelle connexion WebSocket !");
        
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (data.disconnect) {
                connection.socket.send(JSON.stringify({disconnect: true}));
            }
            const lobbyKey = data.lobbyKey;
            console.log(`lobby key in launching game : ${lobbyKey}`);
            if (!lobbies[lobbyKey]) {
                console.log("❌ Lobby not found !");
                return ;
            }
            const lobby = lobbies[lobbyKey];
            if (!lobby.players.includes(connection)) {
                lobby.players.push(connection);
            }
            if (data.move || data.playerReady) {
                handleGameInput(data, lobbyKey);
            }
        });
        
        connection.socket.on("close", () => {
            cleanupLobby(connection);
            console.log("Connexion WebSocket fermée.");
        });

    });
});

function resetBall(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    gameState.ball.x = arena_width / 2;
    gameState.ball.y = arena_height / 2;
    gameState.ballSpeed.ballSpeedX /= 2;
    if (gameState.ballSpeed.ballSpeedX < 1.6)
        gameState.ballSpeed.ballSpeedX = 1.6;
    gameState.ballSpeed.ballSpeedY /= 2;
    if (gameState.ballSpeed.ballSpeedY < 1.6)
        gameState.ballSpeed.ballSpeedY = 1.6;
    gameState.speed = Math.sqrt(gameState.ballSpeed.ballSpeedX * gameState.ballSpeed.ballSpeedX + gameState.ballSpeed.ballSpeedY * gameState.ballSpeed.ballSpeedY);
    let angle;
    if (Math.random() < 0.5) {
        angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
    }
    else {
        angle = Math.random() * (Math.PI / 2) + (3 * Math.PI) / 4;
    }
    gameState.ballSpeed.ballSpeedX = gameState.speed * Math.cos(angle);
    gameState.ballSpeed.ballSpeedY = gameState.speed * Math.sin(angle);
}

function update(lobbyKey) {
    if (!lobbies[lobbyKey]) {
        return ;
    }
    let gameState = lobbies[lobbyKey].gameState;
    if (gameState.moving.player1.up && gameState.paddles.player1.y > 0) {
        gameState.paddles.player1.y -= move;
    }
    if (gameState.moving.player1.down && gameState.paddles.player1.y < arena_height - paddleHeight) {
        gameState.paddles.player1.y += move;
    }
    if (gameState.moving.player2.up && gameState.paddles.player2.y > 0) {
        gameState.paddles.player2.y -= move;
    }
    if (gameState.moving.player2.down && gameState.paddles.player2.y < arena_height - paddleHeight) {
        gameState.paddles.player2.y += move;
    }

    gameState.ball.x += gameState.ballSpeed.ballSpeedX;
    gameState.ball.y += gameState.ballSpeed.ballSpeedY;

    if (gameState.ball.y + ballRadius > arena_height || gameState.ball.y - ballRadius < 0)
        gameState.ballSpeed.ballSpeedY = -gameState.ballSpeed.ballSpeedY;
    if (gameState.ball.x - ballRadius < paddleWidth && gameState.ball.y > gameState.paddles.player1.y && gameState.ball.y < gameState.paddles.player1.y + paddleHeight) {
        gameState.ballSpeed.ballSpeedX = -gameState.ballSpeed.ballSpeedX * 1.1;
        if (gameState.ballSpeed.ballSpeedX > 15)
            gameState.ballSpeed.ballSpeedX = 15;
    }  
    if (gameState.ball.x + ballRadius > arena_width - paddleWidth && gameState.ball.y > gameState.paddles.player2.y && gameState.ball.y < gameState.paddles.player2.y + paddleHeight) {
        gameState.ballSpeed.ballSpeedX = -gameState.ballSpeed.ballSpeedX * 1.1;
        if (gameState.ballSpeed.ballSpeedX < -15)
            gameState.ballSpeed.ballSpeedX = -15;
    }
    if (gameState.ball.x - ballRadius < 0) {
        gameState.score.player2++;
        resetBall(lobbyKey);
    }
    if (gameState.ball.x + ballRadius > arena_width) {
        gameState.score.player1++;
        resetBall(lobbyKey);
    }
}

function new_game(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;

    gameState.score.player1 = 0;
    gameState.score.player2 = 0;
    gameState.ballSpeed.ballSpeedX = 1.6;
    gameState.ballSpeed.ballSpeedY = 1.6;
    move = 5;
    resetBall(lobbyKey);
}

function check_score(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;

    if (gameState.score.player1 == 3 || gameState.score.player2 == 3) {
        gameState.game.player1 = 0;
        gameState.game.player2 = 0;
        gameState.ballSpeed.ballSpeedX = 1.6
        gameState.ballSpeed.ballSpeedY = 1.6
    }
}

function gameLoop(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    if (gameState.playerReady.player1 && gameState.playerReady.player2) {
      update(lobbyKey);
      check_score(lobbyKey);
      lobbies[lobbyKey].players.forEach(client => {
        console.log("sending to players");
          client.socket.send(JSON.stringify({ gameState, "lobbyKey": lobbyKey }));
      });
  }
}

function cleanupLobby(connection) {
    Object.keys(lobbies).forEach(lobbyKey => {
        let lobby = lobbies[lobbyKey];
        if (!lobby || !lobby.players) return;

        console.log(`🧹 Nettoyage du lobby: ${lobbyKey}`);
        
        let newPlayers = [];
        for (let i = 0; i < lobby.players.length; i++) {
            if (lobby.players[i] !== connection) {
                newPlayers.push(lobby.players[i]);
            }
        }
        lobby.players = newPlayers;

        if (lobby.players.length === 0) {
            console.log(`🗑️ Suppression du lobby: ${lobbyKey}`);
            
            if (lobby.gameinterval) {
                clearInterval(lobby.gameinterval);
                lobby.gameinterval = null;
            }

            delete lobbies[lobbyKey];
        }
    });
}

function handleGameInput(data, lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    const gameState = lobbies[lobbyKey].gameState;

    if (!gameState.moving) {
        gameState.moving = { player1: { up: false, down: false }, player2: { up: false, down: false } };
    }
    if (data.player == 1) {
        if (data.move === "up") {
            gameState.moving.player1.up = true;
            gameState.moving.player1.down = false;
        } else if (data.move === "down") {
            gameState.moving.player1.down = true;
            gameState.moving.player1.up = false;
        } else if (data.move === "stop") {
            gameState.moving.player1.up = false;
            gameState.moving.player1.down = false;
        }
    }
    if (data.player == 2) {
        if (data.move === "up") {
            gameState.moving.player2.up = true;
            gameState.moving.player2.down = false;
        } else if (data.move === "down") {
            gameState.moving.player2.down = true;
            gameState.moving.player2.up = false;
        } else if (data.move === "stop") {
            gameState.moving.player2.up = false;
            gameState.moving.player2.down = false;
        }
    }
    if (data.playerReady) {
        console.log("Registering player state");
        if (data.player == 1)
            gameState.playerReady.player1 = true;
        if (data.player == 2)
            gameState.playerReady.player2 = true;
        if (gameState.playerReady.player1 && gameState.playerReady.player2) {
            console.log("🎮 Les deux joueurs sont prêts, démarrage du jeu !");
            startGameLoop(lobbyKey);
        }
    }
}

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

function startGameLoop(lobbyKey) {
    if (!lobbies[lobbyKey]) {
        console.log("wrong lobbyKey");
        return;
    }
    lobbies[lobbyKey].gameinterval = setInterval(() =>  {
        if (!lobbies[lobbyKey] || lobbies[lobbyKey].players.length === 0) {
            console.log(`🛑 Arrêt de la partie : ${lobbyKey} (Lobby vide)`);
            if (lobbies[lobbyKey]?.gameinterval) {
                clearInterval(lobbies[lobbyKey]?.gameinterval);
                lobbies[lobbyKey].gameinterval = null;
            }
            delete lobbies[lobbyKey];
            return;
        }
        gameLoop(lobbyKey)
    }, 16);
}

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