console.log("animation pong chargé !")

let ctx: CanvasRenderingContext2D | null = null;
let canvas: HTMLCanvasElement | null = null;

const paddleWidth = 20;
const paddleHeight = 100;
const ballRadius = 10;

let player1Y: number = 0;
let player2Y = 0;

let ballX: number  = 0;
let ballY: number  = 0;
let ballSpeedX: number  = 0;
let ballSpeedY: number  = 0;
let speed: number  = 0;

function initializeAnimationPong() {
    canvas = document.getElementById("pong_animation") as HTMLCanvasElement;
    ctx = canvas.getContext("2d");
    if (ctx) {
        player1Y = canvas.height / 2 - paddleHeight / 2;
        player2Y = canvas.height / 2 - paddleHeight / 2;

        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = 4;
        ballSpeedY = 4;
        speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
        resetBall();
        draw();
        gameLoop();
    }
}

function drawBackground() {
    if (!ctx || !canvas) {
        return ;
	}
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    drawBackground()
    if (!ctx || !canvas) {
      return ;
    }
    // Draw paddles
    ctx.fillStyle = "#810000";
    ctx.fillRect(0, player1Y, paddleWidth, paddleHeight); // Player 1

    ctx.fillStyle = "#00009c";
    ctx.fillRect(canvas.width - paddleWidth, player2Y, paddleWidth, paddleHeight); // Player 2

    // Draw ball
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFF00";
    ctx.fill();
    ctx.closePath();
}

function update() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;
    if (!canvas) {
        return ;
    } 

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY;
    }

    if (ballX - ballRadius < paddleWidth && ballY > player1Y && ballY < player1Y + paddleHeight)
        ballSpeedX = -ballSpeedX;

    if (ballX + ballRadius > canvas.width - paddleWidth && ballY > player2Y && ballY < player2Y + paddleHeight)
        ballSpeedX = -ballSpeedX;

    if (ballX - ballRadius < 0) {
        resetBall();
    }

    if (ballX + ballRadius > canvas.width) {
        resetBall();
    }
    player1Y = ballY - paddleHeight / 2;
    player2Y = player1Y;
    if (player1Y < 0)
        player1Y = 0;
    if (player2Y < 0)
        player2Y = 0;
    if (player1Y + paddleHeight > canvas.height)
        player1Y = canvas.height - paddleHeight;
    if (player2Y + paddleHeight > canvas.height)
        player2Y = canvas.height - paddleHeight;
}

function resetBall() {
    if (!canvas) {
        return ;
    }
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    speed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);

    let angle: number;
    if (Math.random() < 0.5) {
        angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
    }
    else {
        angle = Math.random() * (Math.PI / 2) + (3 * Math.PI) / 4;
    }

    ballSpeedX = speed * Math.cos(angle);
    ballSpeedY = speed * Math.sin(angle);
}


function gameLoop() {
	if (!ctx) {
		return;
	}
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function animation_pong_stop() {
	ctx = null;
	canvas = null;
}