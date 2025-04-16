let lobbies = {};

const lobbyKey = data.lobbyKey;
if (!lobbies[lobbyKey]) {
	lobbies[lobbyKey] = {
		players: [],
		socketOrder: [],
		gameState: {
			ball: { x: 500, y: 250 },
			paddles: { player1: { name: username1, y: 200 }, player2: { name: username2, y: 200 } },
			score: { player1: 0, player2: 0 },
			moving: { player1: { up: false, down: false }, player2: { up: false, down: false } },
			ballSpeed: {ballSpeedX: 3.2, ballSpeedY: 3.2},
			speed: Math.sqrt(3.2 * 3.2 + 3.2 * 3.2),
			playerReady: {player1: false, player2: false},
			gameinterval: null
		}
	}

function ia_init_game(user1: string): void {
    console.log("Initialisation de l'ia...");

    const IaCanvas = document.getElementById("pongIACanvas") as HTMLCanvasElement;
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "ingame"})
    });
	mystatus = "ingame";
	if (IaCanvas) {
		const ctx = IaCanvas.getContext("2d");
		if (!ctx) {
			return ;
		}
		const paddleWidth = 20;
		const paddleHeight = 100;
		const ballRadius = 10;
		const ia_player = "ia";

		let canvasWidth: number = IaCanvas.offsetWidth;
        let canvasHeight: number = IaCanvas.offsetHeight;

        IaCanvas.width = canvasWidth;
        IaCanvas.height = canvasHeight;

		let ratio: number = canvasWidth / 1000;

		document.addEventListener("keydown", (event) => {
			let message: { player?: number; move?: string; playerReady?: boolean; lobbyKey?: string | null} | null = null;
			if (event.key === "ArrowUp")
				message = { player: player_id, move: "up", "lobbyKey": lobbyKey };
			if (event.key === "ArrowDown")
				message = { player: player_id, move: "down", "lobbyKey": lobbyKey};
			if (event.key === " " && disp == true) {
				win = 0;
				message = { playerReady: true, player: player_id, "lobbyKey": lobbyKey };
				console.log("message from front: ", message);
			}
		})

        document.addEventListener("keyup", (event) => {
			let message: { player?: number; move?: string; game?: string; lobbyKey?: string | null } | null = null;

			if (event.key === "ArrowUp" || event.key === "ArrowDown") {
				message = { player: player_id, move: "stop", "lobbyKey": lobbyKey  };
			}
		})
		function drawGame(): void {
			if (!ctx) {
				return ;
			}

			let canvasWidth: number = IaCanvas.offsetWidth;
			let canvasHeight: number = IaCanvas.offsetHeight;

			IaCanvas.width = canvasWidth;
			IaCanvas.height = canvasHeight;

			let ratio: number = canvasWidth / 1000;

			ctx.clearRect(0, 0, IaCanvas.width, IaCanvas.height);

			ctx.drawImage(RED_PADDLE, 0, gameState.paddles.player1.y  * ratio, paddleWidth * ratio, paddleHeight * ratio);

			ctx.drawImage(BLUE_PADDLE, IaCanvas.width - (paddleWidth * ratio), gameState.paddles.player2.y  * ratio, paddleWidth * ratio, paddleHeight * ratio);

			ctx.beginPath();
			ctx.arc(gameState.ball.x * ratio, gameState.ball.y * ratio, ballRadius * ratio, 0, Math.PI * 2);
			ctx.fillStyle = "#efb60a";
			ctx.fill();

			ctx.lineWidth = 2;
			ctx.strokeStyle = "black";
			ctx.stroke();

			if (disp == true) {
				ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
				ctx.fillStyle = "black";
				ctx.textAlign = "center";
				ctx.fillText("Press SPACE to start", IaCanvas.width / 2, IaCanvas.height / 2 + (200 * ratio));
			}
		}
		requestAnimationFrame(drawGame);
	};
	function gameLoop(): void {
		drawGame();
		requestAnimationFrame(gameLoop);
	}
	gameLoop();
}

function updateAI(lobbyKey) {
	const lobby = lobbies[lobbyKey];
	if (!lobby) return;
	const gameState = lobby.gameState;
	// Calculer le centre de la palette de l'IA (player2)
	const paddleCenter = gameState.paddles.player2.y + paddleHeight / 2;
	// Si la balle est au-dessus du centre, remonter la palette
	if (gameState.ball.y < paddleCenter - 10) {
		gameState.moving.player2.up = true;
		gameState.moving.player2.down = false;
	}
	// Si la balle est en-dessous du centre, descendre la palette
	else if (gameState.ball.y > paddleCenter + 10) {
		gameState.moving.player2.down = true;
		gameState.moving.player2.up = false;
	}
	else {
		gameState.moving.player2.up = false;
		gameState.moving.player2.down = false;
	}
}

let lobbies = {};
let move = 5;
const arena_height = 500;
const arena_width = 1000;
const paddleWidth = 20;
const paddleHeight = 100;
const ballRadius = 10;

function resetBall(lobbyKey) {
    if (!lobbies[lobbyKey])
        return ;
    gameState = lobbies[lobbyKey].gameState;
    gameState.ball.x = arena_width / 2;
    gameState.ball.y = arena_height / 2;
    gameState.ballSpeed.ballSpeedX /= 2;
    if (gameState.ballSpeed.ballSpeedX < 3.2)
        gameState.ballSpeed.ballSpeedX = 3.2;
    gameState.ballSpeed.ballSpeedY /= 2;
    if (gameState.ballSpeed.ballSpeedY < 3.2)
        gameState.ballSpeed.ballSpeedY = 3.2;
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
        if (gameState.ballSpeed.ballSpeedX > 20)
            gameState.ballSpeed.ballSpeedX = 20;
    }
    if (gameState.ball.x + ballRadius > arena_width - paddleWidth && gameState.ball.y > gameState.paddles.player2.y && gameState.ball.y < gameState.paddles.player2.y + paddleHeight) {
        gameState.ballSpeed.ballSpeedX = -gameState.ballSpeed.ballSpeedX * 1.1;
        if (gameState.ballSpeed.ballSpeedX < -20)
            gameState.ballSpeed.ballSpeedX = -20;
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
