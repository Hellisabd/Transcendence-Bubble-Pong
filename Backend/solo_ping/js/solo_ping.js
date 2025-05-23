const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));
const axios = require("axios");

const move = Math.PI / 50;
const paddle_thickness = 15;
const arena_height = 1000;
const arena_width = 1000;
const solo_ballRadius = 15;
const bonusRadius = 50;
const arena_radius = arena_width / 2;
const bonus_set = "PPGGS";
let lobbies = {};

fastify.register(async function (fastify) {
    fastify.get("/ws/solo_ping", { websocket: true }, (connection, req) => {
        
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (data.disconnect) {
                connection.socket.send(JSON.stringify({disconnect: true}));
            }
            const lobbyKey = data.solo_lobbyKey;
			if (!lobbies[lobbyKey]) {
                lobbies[lobbyKey] = {
					player_connection: null,
					gameState: {
						solo_ball: {x: arena_radius, y: arena_radius, speedX: 4.5, speedY: 4.5},
						player: { angle: Math.PI, size: Math.PI * 0.08, move: {up: false, down: false, right: false, left: false} },
						goal: { angle: Math.PI, size: Math.PI / 3, protected: false },
						bonus: {tag: null, x: 350, y: 350 },
						last_bounce: Date.now(),
						bounceInterval : 500,
						bounce: 0,
						score: 0,
						playerReady: false,
						start_solo: false,
						end_solo: false,
						x_bounce: 0,
						y_bounce: 0,
						solo_bonus_bool: 0,
					}
				}
			}
			const lobby = lobbies[lobbyKey];
            if (!lobby.player_connection) {
                lobby.player_connection = connection;
            }
            if (data.move || data.ready) {
                handleGameInput(data, lobbyKey);
            }
        });
		connection.socket.on("close", () => {
            cleanupLobby(connection);
		});
	});
});

function cleanupLobby(connection) {
    Object.keys(lobbies).forEach(lobbyKey => {
        let lobby = lobbies[lobbyKey];
        if (!lobby || !lobby.player_connection) 
			return;
        
		if (lobby.player_connection === connection) {
			lobby.player_connection = null;
		}

        if (lobby.player_connection == null) {
            
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
	if (data.move === "up") {
		gameState.player.move.up = true;
		gameState.player.move.down = false;
		gameState.player.move.right = false;
		gameState.player.move.left = false;
	} else if (data.move === "down") {
		gameState.player.move.up = false;
		gameState.player.move.down = true;
		gameState.player.move.right = false;
		gameState.player.move.left = false;
	} else if (data.move === "right") {
		gameState.player.move.up = false;
		gameState.player.move.down = false;
		gameState.player.move.right = true;
		gameState.player.move.left = false;
	} else if (data.move === "left") {
		gameState.player.move.up = false;
		gameState.player.move.down = false;
		gameState.player.move.right = false;
		gameState.player.move.left = true;
	} else if (data.move === "stop") {
		gameState.player.move.up = false;
		gameState.player.move.down = false;
		gameState.player.move.right = false;
		gameState.player.move.left = false;
	}
	if (data.ready == true) {
		gameState.start_solo = true;
		lobbies[lobbyKey].player_connection.socket.send(JSON.stringify({ start: "start" }));
		solo_randballPos(gameState);
		startGameLoop(lobbyKey);
	}
}

function gameLoop(lobbyKey) {
	if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    if (gameState.start_solo) {
		solo_update(lobbyKey);
		lobbies[lobbyKey].player_connection.socket.send(JSON.stringify({ gameState, "solo_lobbyKey": lobbyKey }));
  	}
}

function startGameLoop(lobbyKey) {
    if (!lobbies[lobbyKey]) {
        return;
    }
    if (lobbies[lobbyKey].gameinterval) {
		
		new_solo_game(lobbyKey);
        return ;
    }
    lobbies[lobbyKey].gameinterval = setInterval(() =>  {
		if (lobbies[lobbyKey] && lobbies[lobbyKey].player_connection == null && lobbies[lobbyKey].gameinterval) {
			clearInterval(lobbies[lobbyKey]?.gameinterval);
            lobbies[lobbyKey].gameinterval = null;
            lobbies[lobbyKey] = null;
            return;
        }
        gameLoop(lobbyKey)
    }, 16);
}

function solo_randballPos(gameState) {
    gameState.solo_ball.x = Math.floor(Math.random() * arena_width);
    gameState.solo_ball.y = Math.floor(Math.random() * arena_height);
    let dx = gameState.solo_ball.x - arena_width / 2;
    let dy = gameState.solo_ball.y - arena_height / 2;
    let solo_ball_dist = Math.sqrt(dx * dx + dy * dy);
    if (solo_ball_dist + solo_ballRadius + 50 >= arena_radius)
        solo_randballPos(gameState);
}

function new_solo_game(lobbyKey) {
	if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    solo_randballPos(gameState);
    gameState.score = 0;
    gameState.bounce = 0;
    gameState.player.angle = Math.PI;
    gameState.player.size = Math.PI * 0.08;
    gameState.goal.angle = Math.PI;
    gameState.goal.size = Math.PI / 3;
    gameState.solo_bonus_bool = 0;
    gameState.bonus.tag = null;
    gameState.solo_ball.speedX = 4.5;
    gameState.solo_ball.speedY = 4.5;
    gameState.start_solo = true;
    gameState.end_solo = false;
}

function solo_update(lobbyKey) {
	if (!lobbies[lobbyKey]) {
        return ;
    }
    let gameState = lobbies[lobbyKey].gameState;

	gameState.solo_ball.x += gameState.solo_ball.speedX;
	gameState.solo_ball.y += gameState.solo_ball.speedY;
	
	if (gameState.solo_ball.speedX > 10)
		gameState.solo_ball.speedX = 10;
	if (gameState.solo_ball.speedX < -10)
		gameState.solo_ball.speedX = -10;
	if (gameState.solo_ball.speedY > 10)
		gameState.solo_ball.speedY = 10;
	if (gameState.solo_ball.speedY < -10)
		gameState.solo_ball.speedY = -10;

	function normalizeAngle(angle) {
		return (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
	}
	
	let dx = gameState.solo_ball.x - arena_radius;
	let dy = gameState.solo_ball.y - arena_radius;
	let solo_ball_dist = Math.sqrt(dx * dx + dy * dy);
	let solo_ball_angle = normalizeAngle(Math.atan2(gameState.solo_ball.y - arena_radius, gameState.solo_ball.x - arena_radius));
	if (solo_ball_angle < 0)
		solo_ball_angle += 2 * Math.PI;

	//MOVE PADDLE
	if (gameState.player.move.up || gameState.player.move.left) {
		gameState.player.angle -= move;
	}
	if (gameState.player.move.down || gameState.player.move.right) {
		gameState.player.angle += move;
	}
	if (gameState.player.angle > 2 * Math.PI)
		gameState.player.angle -= 2 * Math.PI;
	if (gameState.player.angle < 0)
		gameState.player.angle += 2 * Math.PI;

	//BOUNCES
	let lim_inf_player = normalizeAngle(gameState.player.angle - gameState.player.size);
	if (lim_inf_player < 0)
		lim_inf_player += 2 * Math.PI;
	let lim_sup_player = normalizeAngle(gameState.player.angle + gameState.player.size);
	let lim_inf_goal = normalizeAngle(gameState.goal.angle - gameState.goal.size / 2);
	if (lim_inf_goal < 0)
		lim_inf_goal += 2 * Math.PI;        
	let lim_sup_goal = normalizeAngle(gameState.goal.angle + gameState.goal.size / 2);
	if (lim_sup_goal > 2 * Math.PI)
		lim_sup_goal -= 2 * Math.PI;

	if (solo_ball_dist + solo_ballRadius + paddle_thickness > arena_radius - paddle_thickness && Date.now() > gameState.last_bounce) {
		if (lim_inf_player < lim_sup_player) {
			if (solo_ball_angle >= lim_inf_player && solo_ball_angle <= lim_sup_player) {
				gameState.last_bounce = Date.now() + gameState.bounceInterval;
				gameState.bounce++;
				let impactFactor = (solo_ball_angle - gameState.player.angle) / gameState.player.size;
				let bounceAngle = impactFactor * Math.PI / 4;
				let speed = Math.sqrt(gameState.solo_ball.speedX ** 2 + gameState.solo_ball.speedY ** 2);
				gameState.solo_ball.speedX = speed * Math.cos(solo_ball_angle + bounceAngle) * -1.1;
				gameState.solo_ball.speedY = speed * Math.sin(solo_ball_angle + bounceAngle) * -1.1;
				gameState.goal.angle = Math.random() * 2 * Math.PI;
				gameState.player.size -= 0.01 * Math.PI;
				if (gameState.player.size < 0.03 * Math.PI)
					gameState.player.size = 0.03 * Math.PI;
				gameState.score += gameState.player.size * speed * 5;
			}
		}
		else {
			if (solo_ball_angle >= lim_inf_player || solo_ball_angle <= lim_sup_player) {
				gameState.last_bounce = Date.now() + gameState.bounceInterval;
				gameState.bounce++;
				let impactFactor = (solo_ball_angle - gameState.player.angle) / gameState.player.size;
				let bounceAngle = impactFactor * Math.PI / 4;
				let speed = Math.sqrt(gameState.solo_ball.speedX ** 2 + gameState.solo_ball.speedY ** 2);
				gameState.solo_ball.speedX = speed * Math.cos(solo_ball_angle + bounceAngle) * -1.1;
				gameState.solo_ball.speedY = speed * Math.sin(solo_ball_angle + bounceAngle) * -1.1;
				gameState.goal.angle = Math.random() * 2 * Math.PI;
				gameState.player.size -= 0.01 * Math.PI;
				if (gameState.player.size < 0.03 * Math.PI)
					gameState.player.size = 0.03 * Math.PI;
				gameState.score += gameState.player.size * speed * 5;
			}
		}
	}
	if (gameState.goal.protected == false && Date.now() > gameState.last_bounce && solo_ball_dist + solo_ballRadius + 5 > arena_radius) {
		if (lim_inf_goal < lim_sup_goal) {
			if (solo_ball_angle >= lim_inf_goal && solo_ball_angle <= lim_sup_goal) {
				gameState.start_solo = false;
				gameState.end_solo = true;
				lobbies[lobbyKey].player_connection?.socket.send(JSON.stringify({ draw_score: true, score: gameState.score }));
				send_score(lobbyKey, gameState.score);
				return ;
			}
		}
		else {
			if (solo_ball_angle >= lim_inf_goal || solo_ball_angle <= lim_sup_goal) {
				gameState.start_solo = false;
				gameState.end_solo = true;
				lobbies[lobbyKey].player_connection?.socket.send(JSON.stringify({ draw_score: true, score: gameState.score }));
				send_score(lobbyKey, gameState.score);
				return ;
			} 
		}
	}
	if (gameState.goal.protected == true && Date.now() > gameState.last_bounce && solo_ball_dist + solo_ballRadius + 5 > arena_radius) {
		if (lim_inf_goal < lim_sup_goal) {
			if (solo_ball_angle >= lim_inf_goal && solo_ball_angle <= lim_sup_goal) {
				gameState.goal.protected = false;
				gameState.last_bounce = Date.now() + gameState.bounceInterval;
				let normalX = dx / solo_ball_dist;
				let normalY = dy / solo_ball_dist;
				let dotProduct = (gameState.solo_ball.speedX * normalX + gameState.solo_ball.speedY * normalY);
				gameState.solo_ball.speedX -= 2 * dotProduct * normalX;
				gameState.solo_ball.speedY -= 2 * dotProduct * normalY;
			}
		}
		else {
			if (solo_ball_angle >= lim_inf_goal || solo_ball_angle <= lim_sup_goal) {
				gameState.goal.protected = false;
				gameState.last_bounce = Date.now() + gameState.bounceInterval;
				let normalX = dx / solo_ball_dist;
				let normalY = dy / solo_ball_dist;
				let dotProduct = (gameState.solo_ball.speedX * normalX + gameState.solo_ball.speedY * normalY);
				gameState.solo_ball.speedX -= 2 * dotProduct * normalX;
				gameState.solo_ball.speedY -= 2 * dotProduct * normalY;
			} 
		}
	} 
	if (solo_ball_dist + solo_ballRadius + 5 > arena_radius && Date.now() > gameState.last_bounce ) {
		gameState.bounce++;
		draw_bounce = true;
		gameState.x_bounce = gameState.solo_ball.x;
		gameState.y_bounce = gameState.solo_ball.y;
		gameState.last_bounce = Date.now() + gameState.bounceInterval;
		let normalX = dx / solo_ball_dist;
		let normalY = dy / solo_ball_dist;
		let dotProduct = (gameState.solo_ball.speedX * normalX + gameState.solo_ball.speedY * normalY);
		let speed = Math.sqrt(gameState.solo_ball.speedX ** 2 + gameState.solo_ball.speedY ** 2);
		gameState.solo_ball.speedX -= 2.05 * dotProduct * normalX;
		gameState.solo_ball.speedY -= 2.05 * dotProduct * normalY;
		gameState.goal.size += 0.05 * Math.PI;
		if (gameState.bounce % 2 == 0) {
            lobbies[lobbyKey].player_connection?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.solo_ball.x, y_bounce: gameState.solo_ball.y, ping_or_pong: 0 }));
        }
        else {
            lobbies[lobbyKey].player_connection?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.solo_ball.x, y_bounce: gameState.solo_ball.y, ping_or_pong: 1 }));
        }
		if (gameState.goal.size >= Math.PI)
			gameState.goal.size = Math.PI;
		gameState.score += gameState.goal.size * speed * 2;
	}
	bonusManager(gameState);
}

function bonusManager(gameState) {
	function randBonusPos(gameState) {
		gameState.bonus.x = Math.floor(Math.random() * arena_width);
		gameState.bonus.y = Math.floor(Math.random() * arena_height);
		let dx = gameState.bonus.x - arena_width / 2;
		let dy = gameState.bonus.y - arena_height / 2;
		let bonus_dist = Math.sqrt(dx * dx + dy * dy);
		if (bonus_dist + 200  >= arena_radius)
			randBonusPos(gameState);
	}
	if (gameState.bounce >= 2 && gameState.solo_bonus_bool == 0) {
		gameState.solo_bonus_bool = 1;
		let r = bonus_set[Math.floor(Math.random() * bonus_set.length)];
		gameState.bonus.tag = r;
		randBonusPos(gameState);
	}
	if (gameState.bounce >= 2 && gameState.solo_bonus_bool == 1) {
		let dist_solo_ball_bonus = Math.sqrt(((gameState.solo_ball.x - gameState.bonus.x) * (gameState.solo_ball.x - gameState.bonus.x)) + ((gameState.solo_ball.y - gameState.bonus.y) * (gameState.solo_ball.y - gameState.bonus.y)));
		if (dist_solo_ball_bonus <= solo_ballRadius + bonusRadius) {
			gameState.score += 1000;
			if (gameState.bonus.tag == 'P') {
				gameState.player.size += Math.PI * 0.03;
				if (gameState.player.size > Math.PI)
					gameState.player.size = Math.PI;
			}
			if (gameState.bonus.tag == 'G') {
				gameState.goal.size -= Math.PI * 0.2;
				if (gameState.goal.size <= Math.PI / 6 )
					gameState.goal.size = Math.PI / 6;
			}
			if (gameState.bonus.tag == 'S') {
				gameState.goal.protected = true;
			}
			gameState.bonus.tag = null;
			gameState.solo_bonus_bool = 0;
		}
	}
}

async function send_score(lobbyKey, score) {
	try {
		axios.post("http://users:5000/update_solo_score",
			{ username: lobbyKey, score: Math.round(score) },
			{ headers: { "Content-Type": "application/json" } }
    	);
	}
	catch (error) {
		console.log(error.message);
	}
	sending = false;
}

const start = async () => {
    try {
        await fastify.listen({ port: 4003, host: "0.0.0.0" });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();