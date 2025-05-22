const fastify = require("fastify")({ logger: true });
fastify.register(require("@fastify/websocket"));

let lobbies = {};

const move = Math.PI / 50;
const paddle_thickness = 15;
const arena_height = 1000;
const arena_width = 1000;
const ballRadius = 15;
const bonusRadius = 50;
const arena_radius = arena_width / 2;
const bonus = "PPGGS";

fastify.register(async function (fastify) {
    fastify.get("/ws/ping", { websocket: true }, (connection, req) => {
        
        connection.socket.on("message", (message) => {
            const data = JSON.parse(message.toString());
            if (data.disconnect) {
                connection.socket.send(JSON.stringify({disconnect: true}));
            }
            const lobbyKey = data.ping_lobbyKey;
            if (!lobbies[lobbyKey]) {
                lobbies[lobbyKey] = {
                    players: [],
                    socketOrder: [],
                    gameState: {
                        ball: { x: arena_radius, y: arena_radius },
                        paddles: { player1: { name: data.username1, angle: Math.PI, size: Math.PI * 0.08 }, player2: { name: data.username2, angle: 0, size: Math.PI * 0.08 } },
                        goals: { player1: { angle: Math.PI, size: Math.PI / 3, protected: false }, player2: { angle: 0, size: Math.PI / 3, protected: false } },
                        score: { player1: 0, player2: 0 },
                        moving: { player1: { up: false, down: false, right: false, left: false }, player2: { up: false, down: false, right: false, left: false } },
                        ballSpeed: {ballSpeedX: 4.5, ballSpeedY: 4.5},
                        speed: Math.sqrt(4.5 * 4.5 + 4.5 * 4.5),
                        playerReady: {player1: false, player2: false},
                        bonus: {tag: null, x: 350, y: 350 },
                        gameinterval: null,
                        lastBounce: Date.now(),
                        bounceInterval : 500,
                        bounce: 0,
                        totalBounce: 0,
                        bonus_bool: 0,
                        last_player: null,
                        player_and_bonus : {player : null, bonus: null}, 
                        bonus_stats: []
                    }
                }
            }
            const lobby = lobbies[lobbyKey];
            if (!lobby.players.includes(connection)) {
                lobby.socketOrder.push(data.myuser);
                lobby.players.push(connection);
            }
            if (data.move || data.playerReady) {
                handleGameInput(data, lobbyKey);
            }
        });
        connection.socket.on("close", () => {
            cleanupLobby(connection);
        });
    });
});

function resetParam (lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    gameState.totalBounce += gameState.bounce;
    gameState.bounce = 0;
    gameState.bonus_bool = 0;
    gameState.bonus.tag = null;
    gameState.last_player = null;
    gameState.paddles.player1.size = Math.PI * 0.08;
    gameState.paddles.player2.size = Math.PI * 0.08;
    gameState.goals.player1.size = Math.PI / 3;
    gameState.goals.player2.size = Math.PI / 3;
    gameState.goals.player1.protected = false;
    gameState.goals.player2.protected = false;
    gameState.paddles.player1.angle = Math.PI;
    gameState.paddles.player2.angle = 0;
    gameState.goals.player1.angle = Math.PI;
    gameState.goals.player2.angle = 0;
    gameState.lastBounce = Date.now();
}

function resetBall(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    randBallPos(gameState);
    gameState.ballSpeed.ballSpeedX = 4.5;
    gameState.ballSpeed.ballSpeedY = 4.5;
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

    gameState.ball.x += gameState.ballSpeed.ballSpeedX;
    gameState.ball.y += gameState.ballSpeed.ballSpeedY;
    
    let dx = gameState.ball.x - arena_width / 2;
    let dy = gameState.ball.y - arena_height / 2;
    let ball_dist = Math.sqrt(dx * dx + dy * dy);
    let ball_angle = Math.atan2(dy, dx);
    if (ball_angle < 0)
        ball_angle += 2 * Math.PI;

    move_paddle(gameState.paddles.player1, gameState.moving.player1, gameState.paddles.player2);
    move_paddle(gameState.paddles.player2, gameState.moving.player2, gameState.paddles.player1);

    let lim_inf_player1 = gameState.paddles.player1.angle - gameState.paddles.player1.size;
    if (lim_inf_player1 < 0)
        lim_inf_player1 += 2 * Math.PI;

    let lim_sup_player1 = gameState.paddles.player1.angle + gameState.paddles.player1.size;
    if (lim_sup_player1 > 2 * Math.PI)
        lim_sup_player1 -= 2 * Math.PI;

    let lim_inf_player2 = gameState.paddles.player2.angle - gameState.paddles.player2.size;
    if (lim_inf_player2 < 0)
        lim_inf_player2 += 2 * Math.PI;

    let lim_sup_player2 = gameState.paddles.player2.angle + gameState.paddles.player2.size;
    if (lim_sup_player2 > 2 * Math.PI)
        lim_sup_player2 -= 2 * Math.PI;

    if (ball_dist + ballRadius + paddle_thickness > arena_radius - paddle_thickness && Date.now() > gameState.lastBounce) {
        if (lim_inf_player1 < lim_sup_player1) {
            if (ball_angle >= lim_inf_player1 && ball_angle <= lim_sup_player1) {
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                gameState.bounce++;
        
                let impactFactor = (ball_angle - gameState.paddles.player1.angle) / gameState.paddles.player1.size;
        
                let bounceAngle = impactFactor * Math.PI / 4;
                let speed = Math.sqrt(gameState.ballSpeed.ballSpeedX ** 2 + gameState.ballSpeed.ballSpeedY ** 2);
        
                gameState.ballSpeed.ballSpeedX = speed * Math.cos(ball_angle + bounceAngle) * -1.05;
                gameState.ballSpeed.ballSpeedY = speed * Math.sin(ball_angle + bounceAngle) * -1.05;
                
                randGoalPos(gameState.goals.player1, gameState.goals.player2);
                gameState.last_player = "player1";
            }
        }
        else {
            if (ball_angle >= lim_inf_player1 || ball_angle <= lim_sup_player1) {
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                gameState.bounce++;
        
                let impactFactor = (ball_angle - gameState.paddles.player1.angle) / gameState.paddles.player1.size;
        
                let bounceAngle = impactFactor * Math.PI / 4;
                let speed = Math.sqrt(gameState.ballSpeed.ballSpeedX ** 2 + gameState.ballSpeed.ballSpeedY ** 2);
        
                gameState.ballSpeed.ballSpeedX = speed * Math.cos(ball_angle + bounceAngle) * -1.05;
                gameState.ballSpeed.ballSpeedY = speed * Math.sin(ball_angle + bounceAngle) * -1.05;
                
                randGoalPos(gameState.goals.player1, gameState.goals.player2);
                gameState.last_player = "player1";
            }
        }
        if (lim_inf_player2 < lim_sup_player2) {
            if (ball_angle >= lim_inf_player2 && ball_angle <= lim_sup_player2) {
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                gameState.bounce++;
        
                let impactFactor = (ball_angle - gameState.paddles.player2.angle) / gameState.paddles.player2.size;
        
                let bounceAngle = impactFactor * Math.PI / 4;
                let speed = Math.sqrt(gameState.ballSpeed.ballSpeedX ** 2 + gameState.ballSpeed.ballSpeedY ** 2);
        
                gameState.ballSpeed.ballSpeedX = speed * Math.cos(ball_angle + bounceAngle) * -1.05;
                gameState.ballSpeed.ballSpeedY = speed * Math.sin(ball_angle + bounceAngle) * -1.05;
        
                randGoalPos(gameState.goals.player2, gameState.goals.player1);
                gameState.last_player = "player2";
            }
        }
        else {
            if (ball_angle >= lim_inf_player2 || ball_angle <= lim_sup_player2) {
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                gameState.bounce++;
        
                let impactFactor = (ball_angle - gameState.paddles.player2.angle) / gameState.paddles.player2.size;
        
                let bounceAngle = impactFactor * Math.PI / 4;
                let speed = Math.sqrt(gameState.ballSpeed.ballSpeedX ** 2 + gameState.ballSpeed.ballSpeedY ** 2);
        
                gameState.ballSpeed.ballSpeedX = speed * Math.cos(ball_angle + bounceAngle) * -1.05;
                gameState.ballSpeed.ballSpeedY = speed * Math.sin(ball_angle + bounceAngle) * -1.05;
        
                randGoalPos(gameState.goals.player2, gameState.goals.player1);
                gameState.last_player = "player2";
            }
        }
    }

    if (gameState.ballSpeed.ballSpeedX > 10)
        gameState.ballSpeed.ballSpeedX = 10;
    if (gameState.ballSpeed.ballSpeedX < -10)
        gameState.ballSpeed.ballSpeedX = -10;
    if (gameState.ballSpeed.ballSpeedY > 10)
        gameState.ballSpeed.ballSpeedY = 10;
    if (gameState.ballSpeed.ballSpeedY < -10)
        gameState.ballSpeed.ballSpeedY = -10;

    let lim_inf_goal1 = gameState.goals.player1.angle - gameState.goals.player1.size / 2;
    if (lim_inf_goal1 < 0)
        lim_inf_goal1 += 2 * Math.PI;

    let lim_sup_goal1 = gameState.goals.player1.angle + gameState.goals.player1.size / 2;
    if (lim_sup_goal1 > 2 * Math.PI)
        lim_sup_goal1 -= 2 * Math.PI;

    let lim_inf_goal2 = gameState.goals.player2.angle - gameState.goals.player2.size / 2;
    if (lim_inf_goal2 < 0)
        lim_inf_goal2 += 2 * Math.PI;

    let lim_sup_goal2 = gameState.goals.player2.angle + gameState.goals.player2.size / 2;
    if (lim_sup_goal2 > 2 * Math.PI)
        lim_sup_goal2 -= 2 * Math.PI;

    if (gameState.goals.player1.protected == false && Date.now() > gameState.lastBounce && ball_dist + ballRadius + 5 > arena_radius) {
        if (lim_inf_goal1 < lim_sup_goal1) {
            if (ball_angle >= lim_inf_goal1 && ball_angle <= lim_sup_goal1) {
                lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ blue_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ blue_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                if (gameState.player_and_bonus.bonus) {
                    gameState.bonus_stats.push({player_who_scored: gameState.paddles.player2.name, player_with_bonus: gameState.player_and_bonus.player, bonus_name: gameState.player_and_bonus.bonus});
                }
                resetBall(lobbyKey);
                gameState.score.player2++;
                resetParam(lobbyKey);
            }
        }
        else {
            if (ball_angle >= lim_inf_goal1 || ball_angle <= lim_sup_goal1) {
                lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ blue_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ blue_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                if (gameState.player_and_bonus.bonus) {
                    gameState.bonus_stats.push({player_who_scored: gameState.paddles.player2.name, player_with_bonus: gameState.player_and_bonus.player, bonus_name: gameState.player_and_bonus.bonus});
                }
                resetBall(lobbyKey);
                gameState.score.player2++;
                resetParam(lobbyKey);
            } 
        }
    }

    if (gameState.goals.player1.protected == true && ball_dist + ballRadius + 5 > arena_radius) {
        if (lim_inf_goal1 < lim_sup_goal1) {
            if (ball_angle >= lim_inf_goal1 && ball_angle <= lim_sup_goal1) {
                gameState.bounce++;
                gameState.goals.player1.protected = false;
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                let normalX = dx / ball_dist;
                let normalY = dy / ball_dist;
            
                let dotProduct = (gameState.ballSpeed.ballSpeedX * normalX + gameState.ballSpeed.ballSpeedY * normalY);
            
                gameState.ballSpeed.ballSpeedX -= 2 * dotProduct * normalX;
                gameState.ballSpeed.ballSpeedY -= 2 * dotProduct * normalY;
            }
        }
        else {
            if (ball_angle >= lim_inf_goal1 || ball_angle <= lim_sup_goal1) {
                gameState.bounce++;
                gameState.goals.player1.protected = false;
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                let normalX = dx / ball_dist;
                let normalY = dy / ball_dist;
            
                let dotProduct = (gameState.ballSpeed.ballSpeedX * normalX + gameState.ballSpeed.ballSpeedY * normalY);
            
                gameState.ballSpeed.ballSpeedX -= 2 * dotProduct * normalX;
                gameState.ballSpeed.ballSpeedY -= 2 * dotProduct * normalY;
            } 
        }
    } 
    if (gameState.goals.player2.protected == false && Date.now() > gameState.lastBounce && ball_dist + ballRadius + 5 > arena_radius) {
        if (lim_inf_goal2 < lim_sup_goal2) {
            if (ball_angle >= lim_inf_goal2 && ball_angle <= lim_sup_goal2) {
                lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ red_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ red_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                if (gameState.player_and_bonus.bonus) {
                    gameState.bonus_stats.push({player_who_scored: gameState.paddles.player1.name, player_with_bonus: gameState.player_and_bonus.player, bonus_name: gameState.player_and_bonus.bonus});
                }
                resetBall(lobbyKey);
                gameState.score.player1++;
                resetParam(lobbyKey);
            }
        }
        else {
            if (ball_angle >= lim_inf_goal2 || ball_angle <= lim_sup_goal2) {
                lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ red_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ red_goal: true, x_goal: gameState.ball.x, y_goal: gameState.ball.y }));
                if (gameState.player_and_bonus.bonus) {
                    gameState.bonus_stats.push({player_who_scored: gameState.paddles.player1.name, player_with_bonus: gameState.player_and_bonus.player, bonus_name: gameState.player_and_bonus.bonus});
                }
                resetBall(lobbyKey);
                gameState.score.player1++;
                resetParam(lobbyKey);
            } 
        }
    }

    if (gameState.goals.player2.protected == true && Date.now() > gameState.lastBounce && ball_dist + ballRadius + 5 > arena_radius) {
        if (lim_inf_goal2 < lim_sup_goal2) {
            if (ball_angle >= lim_inf_goal2 && ball_angle <= lim_sup_goal2) {
                gameState.bounce++;
                gameState.goals.player2.protected = false;
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                let normalX = dx / ball_dist;
                let normalY = dy / ball_dist;
            
                let dotProduct = (gameState.ballSpeed.ballSpeedX * normalX + gameState.ballSpeed.ballSpeedY * normalY);
            
                gameState.ballSpeed.ballSpeedX -= 2 * dotProduct * normalX;
                gameState.ballSpeed.ballSpeedY -= 2 * dotProduct * normalY;
            }
        }
        else {
            if (ball_angle >= lim_inf_goal2 || ball_angle <= lim_sup_goal2) {
                gameState.bounce++;
                gameState.goals.player2.protected = false;
                gameState.lastBounce = Date.now() + gameState.bounceInterval;
                let normalX = dx / ball_dist;
                let normalY = dy / ball_dist;
            
                let dotProduct = (gameState.ballSpeed.ballSpeedX * normalX + gameState.ballSpeed.ballSpeedY * normalY);
            
                gameState.ballSpeed.ballSpeedX -= 2 * dotProduct * normalX;
                gameState.ballSpeed.ballSpeedY -= 2 * dotProduct * normalY;
            } 
        }
    }
    
    if (ball_dist + ballRadius + 5 > arena_radius && Date.now() > gameState.lastBounce ) {
        gameState.bounce++;
        gameState.lastBounce = Date.now() + gameState.bounceInterval;
        let normalX = dx / ball_dist;
        let normalY = dy / ball_dist;
    
        let dotProduct = (gameState.ballSpeed.ballSpeedX * normalX + gameState.ballSpeed.ballSpeedY * normalY);
    
        gameState.ballSpeed.ballSpeedX -= 2 * dotProduct * normalX;
        gameState.ballSpeed.ballSpeedY -= 2 * dotProduct * normalY;
        if (gameState.bounce % 2 == 0) {
            lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.ball.x, y_bounce: gameState.ball.y, ping_or_pong: 0 }));
            lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.ball.x, y_bounce: gameState.ball.y, ping_or_pong: 0 }));
        }
        else {
            lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.ball.x, y_bounce: gameState.ball.y, ping_or_pong: 1 }));
            lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ draw_bounce: true, x_bounce: gameState.ball.x, y_bounce: gameState.ball.y, ping_or_pong: 1 }));
        }
    }

    if (gameState.bounce == 20) {
        gameState.goals.player1.size = Math.PI / 2;
        gameState.goals.player2.size = Math.PI / 2;
    }

    if (gameState.bounce == 30) {
        gameState.paddles.player1.size = Math.PI * 0.04;
        gameState.paddles.player2.size = Math.PI * 0.04;
    }

    bonusManager(gameState);
}

function randGoalPos(goal_player, goal_opponent) {
    goal_player.angle = Math.random() * 2 * Math.PI;
    if (circular_distance(goal_player.angle, goal_opponent.angle) < (goal_player.size / 2 + goal_opponent.size / 2)) {
        randGoalPos(goal_player, goal_opponent);
    }
}

function bonusManager(gameState) {
    function randBonusPos(gameState) {
        gameState.bonus.x = Math.floor(Math.random() * arena_width);
        gameState.bonus.y = Math.floor(Math.random() * arena_height);
        let dx = gameState.bonus.x - arena_width / 2;
        let dy = gameState.bonus.y - arena_height / 2;
        let bonus_dist = Math.sqrt(dx * dx + dy * dy);
        if (bonus_dist + 50 >= arena_radius)
            randBonusPos(gameState);
    }
    if (gameState.bounce == 3 && gameState.bonus_bool == 0) {
        gameState.bonus_bool = 1;
        let r = bonus[Math.floor(Math.random() * bonus.length)];
        gameState.bonus.tag = r;
        randBonusPos(gameState);
    }
    if (gameState.bounce >= 3 && gameState.bonus_bool == 1) {
        let dist_ball_bonus = Math.sqrt(((gameState.ball.x - gameState.bonus.x) * (gameState.ball.x - gameState.bonus.x)) + ((gameState.ball.y - gameState.bonus.y) * (gameState.ball.y - gameState.bonus.y)));
        if (dist_ball_bonus <= ballRadius + bonusRadius) {
            if (gameState.bonus.tag == 'P') {
                if (gameState.last_player == "player1") {
                    gameState.player_and_bonus.player = gameState.paddles.player1.name;
                    gameState.player_and_bonus.bonus = "paddles";
                    gameState.paddles.player1.size = Math.PI * 0.12;
                }
                if (gameState.last_player == "player2") {
                    gameState.player_and_bonus.player = gameState.paddles.player2.name;
                    gameState.player_and_bonus.bonus = "paddles";
                    gameState.paddles.player2.size = Math.PI * 0.12;
                }
            }
            if (gameState.bonus.tag == 'G') {
                if (gameState.last_player == "player1") {
                    gameState.goals.player2.size = Math.PI / 2;
                    gameState.player_and_bonus.player = gameState.paddles.player1.name;
                    gameState.player_and_bonus.bonus = "goal";
                }
                if (gameState.last_player == "player2") {
                    gameState.goals.player1.size = Math.PI / 2;
                    gameState.player_and_bonus.player = gameState.paddles.player2.name;
                    gameState.player_and_bonus.bonus = "goal";
                }
            }
            if (gameState.bonus.tag == 'S') {
                if (gameState.last_player == "player1") {
                    gameState.player_and_bonus.player = gameState.paddles.player1.name;
                    gameState.player_and_bonus.bonus = "shield";
                    gameState.goals.player1.protected = true;
                }
                if (gameState.last_player == "player2") {
                    gameState.player_and_bonus.player = gameState.paddles.player2.name;
                    gameState.player_and_bonus.bonus = "shield";
                    gameState.goals.player2.protected = true;
                }
            }
            gameState.bonus.tag = null;
        }
    }
}

function circular_distance(a, b) {
    return Math.min(Math.abs(a - b), 2 * Math.PI - Math.abs(a - b));
}

function move_paddle(paddle, movement, opponent) {
    let min_distance = paddle.size + opponent.size;
    let new_angle = paddle.angle;

    if (movement.up || movement.left) {
        new_angle -= move;
        if (circular_distance(new_angle, opponent.angle) < min_distance) {
            new_angle = (opponent.angle + min_distance) % (2 * Math.PI);
        }
    }

    if (movement.down || movement.right) {
        new_angle += move;
        if (circular_distance(new_angle, opponent.angle) < min_distance) {
            new_angle = (opponent.angle - min_distance + 2 * Math.PI) % (2 * Math.PI);
        }
    }

    paddle.angle = new_angle;
    if (paddle.angle > 2 * Math.PI)
        paddle.angle -= 2 * Math.PI;
    if (paddle.angle < 0)
        paddle.angle += 2 * Math.PI;
}

function new_game(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;

    gameState.score.player1 = 0;
    gameState.score.player2 = 0;
    gameState.ballSpeed.ballSpeedX = 4.5;
    gameState.ballSpeed.ballSpeedY = 4.5;
    resetBall(lobbyKey);
}

function check_score(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;

    if (gameState.score.player1 == 3 || gameState.score.player2 == 3) {
        gameState.playerReady.player1 = false;
        gameState.playerReady.player2 = false;
        gameState.ballSpeed.ballSpeedX = 4.5
        gameState.ballSpeed.ballSpeedY = 4.5
        if ((gameState.score.player1 == 3 && gameState.paddles.player1.name == lobbies[lobbyKey].socketOrder[0]) || (gameState.score.player2 == 3 && gameState.paddles.player2.name == lobbies[lobbyKey].socketOrder[0])) {
                lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ start: "stop", winner: true, bounce: gameState.totalBounce, bonus_stats: gameState.bonus_stats}));
                lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ start: "stop", winner: false, bounce: gameState.totalBounce, bonus_stats: gameState.bonus_stats}));
        }
        else {
            lobbies[lobbyKey].players[0]?.socket.send(JSON.stringify({ start: "stop", winner: false, bounce: gameState.totalBounce, bonus_stats: gameState.bonus_stats}));
            lobbies[lobbyKey].players[1]?.socket.send(JSON.stringify({ start: "stop", winner: true, bounce: gameState.totalBounce, bonus_stats: gameState.bonus_stats}));
        }
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
          client.socket.send(JSON.stringify({ gameState, "ping_lobbyKey": lobbyKey }));
      });
  }
}

function cleanupLobby(connection) {
    Object.keys(lobbies).forEach(lobbyKey => {
        let lobby = lobbies[lobbyKey];
        if (!lobby || !lobby.players) return;

        
        let newPlayers = [];
        for (let i = 0; i < lobby.players.length; i++) {
            if (lobby.players[i] !== connection) {
                newPlayers.push(lobby.players[i]);
            }
        }
        lobby.players = newPlayers;

        if (lobby.players.length === 0) {
            
            if (lobby.gameState.gameinterval) {
                clearInterval(lobby.gameState.gameinterval);
                lobby.gameState.gameinterval = null;
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
        gameState.moving = { player1: { up: false, down: false, right: false, left: false }, player2: { up: false, down: false, right: false, left: false } };
    }
    if (data.player == 1) {
        if (data.move === "up") {
            gameState.moving.player1.up = true;
            gameState.moving.player1.down = false;
            gameState.moving.player1.right = false;
            gameState.moving.player1.left = false;
        } else if (data.move === "down") {
            gameState.moving.player1.up = false;
            gameState.moving.player1.down = true;
            gameState.moving.player1.right = false;
            gameState.moving.player1.left = false;
        } else if (data.move === "right") {
            gameState.moving.player1.up = false;
            gameState.moving.player1.down = false;
            gameState.moving.player1.right = true;
            gameState.moving.player1.left = false;
        } else if (data.move === "left") {
            gameState.moving.player1.up = false;
            gameState.moving.player1.down = false;
            gameState.moving.player1.right = false;
            gameState.moving.player1.left = true;
        } else if (data.move === "stop") {
            gameState.moving.player1.up = false;
            gameState.moving.player1.down = false;
            gameState.moving.player1.right = false;
            gameState.moving.player1.left = false;
        }
    }
    if (data.player == 2) {
        if (data.move === "up") {
            gameState.moving.player2.up = true;
            gameState.moving.player2.down = false;
            gameState.moving.player2.right = false;
            gameState.moving.player2.left = false;
        } else if (data.move === "down") {
            gameState.moving.player2.up = false;
            gameState.moving.player2.down = true;
            gameState.moving.player2.right = false;
            gameState.moving.player2.left = false;
        } else if (data.move === "right") {
            gameState.moving.player2.up = false;
            gameState.moving.player2.down = false;
            gameState.moving.player2.right = true;
            gameState.moving.player2.left = false;
        } else if (data.move === "left") {
            gameState.moving.player2.up = false;
            gameState.moving.player2.down = false;
            gameState.moving.player2.right = false;
            gameState.moving.player2.left = true;
        } else if (data.move === "stop") {
            gameState.moving.player2.up = false;
            gameState.moving.player2.down = false;
            gameState.moving.player2.right = false;
            gameState.moving.player2.left = false;
        }
    }
    if (data.playerReady) {
        if (data.player == 1) {
            gameState.playerReady.player1 = true;
        }
        if (data.player == 2) {
            gameState.playerReady.player2 = true;
        }
        if (gameState.playerReady.player1 && gameState.playerReady.player2) {
            lobbies[lobbyKey].players.forEach(client => {
                  client.socket.send(JSON.stringify({ start: "start" }));
            });
            randBallPos(gameState);
            startGameLoop(lobbyKey);
        }
    }
}

function randBallPos(gameState) {
    gameState.ball.x = Math.floor(Math.random() * arena_width);
    gameState.ball.y = Math.floor(Math.random() * arena_height);
    let dx = gameState.ball.x - arena_width / 2;
    let dy = gameState.ball.y - arena_height / 2;
    let ball_dist = Math.sqrt(dx * dx + dy * dy);
    let ball_angle = Math.atan2(dy, dx);
    if (ball_dist + ballRadius + 50 >= arena_radius || 
        (ball_angle > gameState.goals.player1.angle - gameState.goals.player1.size / 2 && ball_angle < gameState.goals.player1.angle + gameState.goals.player1.size / 2 && ball_dist > arena_width / 4) ||
        (ball_angle > gameState.goals.player2.angle - gameState.goals.player2.size / 2 && ball_angle < Math.PI * 2 && ball_dist > arena_width / 4) ||
        (ball_angle > 0 && ball_angle < gameState.goals.player2.angle + gameState.goals.player2.size / 2 && ball_dist > arena_width / 4))
        randBallPos(gameState);
}

function startGameLoop(lobbyKey) {
    if (!lobbies[lobbyKey]) {
        return;
    }
    if (lobbies[lobbyKey].gameinterval) {
        new_game(lobbyKey);
        return ;
    }
    lobbies[lobbyKey].gameinterval = setInterval(() =>  {
        if (lobbies[lobbyKey] && lobbies[lobbyKey].players.length === 0 && lobbies[lobbyKey].gameinterval) {
            clearInterval(lobbies[lobbyKey]?.gameinterval);
            lobbies[lobbyKey].gameinterval = null;
            lobbies[lobbyKey] = null;
            return;
        }
        gameLoop(lobbyKey)
    }, 16);
}

const start = async () => {
    try {
        await fastify.listen({ port: 4002, host: "0.0.0.0" });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();