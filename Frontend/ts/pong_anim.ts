console.log("animation pong chargé !")

let pong_ctx: CanvasRenderingContext2D | null = null;
let pong_canvas: HTMLCanvasElement | null = null;

let pong_paddleWidth:number = 0;
let pong_paddleHeight:number = 0;
let pong_ballRadius:number = 0;

let pong_player1Y: number = 0;
let pong_player2Y: number = 0;

let pong_ballX: number  = 0;
let pong_ballY: number  = 0;
let pong_ballSpeedX: number  = 0;
let pong_ballSpeedY: number  = 0;
let pong_speed: number  = 0;

function initializeAnimationPong() {
    pong_canvas = document.getElementById("pong_animation") as HTMLCanvasElement;
    pong_ctx = pong_canvas.getContext("2d");
    if (pong_ctx) {
        pong_player1Y = pong_canvas.height / 2 - pong_paddleHeight / 2;
        pong_player2Y = pong_canvas.height / 2 - pong_paddleHeight / 2;

        pong_ballX = pong_canvas.width / 2;
        pong_ballY = pong_canvas.height / 2;
        pong_ballSpeedX = 0.8;
        pong_ballSpeedY = 0.8;
        pong_speed = Math.sqrt(pong_ballSpeedX * pong_ballSpeedX + pong_ballSpeedY * pong_ballSpeedY);
        pong_resetBall();
        pong_draw();
        pong_gameLoop();
    }
}

function pong_drawBackground() {
    if (!pong_ctx || !pong_canvas) {
        return ;
	}
    pong_ctx.fillStyle = "black";
    pong_ctx.fillRect(0, 0, pong_canvas.width, pong_canvas.height);
}

function pong_draw() {
    pong_drawBackground()
    if (!pong_ctx || !pong_canvas) {
      return ;
    }
    pong_ctx.fillStyle = "red";
    pong_ctx.fillRect(0, pong_player1Y, pong_paddleWidth, pong_paddleHeight);

    pong_ctx.fillStyle = "blue";
    pong_ctx.fillRect(pong_canvas.width - pong_paddleWidth, pong_player2Y, pong_paddleWidth, pong_paddleHeight);

    pong_ctx.beginPath();
    pong_ctx.arc(pong_ballX, pong_ballY, pong_ballRadius, 0, Math.PI * 2);
    pong_ctx.fillStyle = "yellow";
    pong_ctx.fill();
    pong_ctx.closePath();
}

function pong_update() {
    if (!pong_canvas) {
        return ;
    }
    pong_ballX += pong_ballSpeedX;
    pong_ballY += pong_ballSpeedY;
    pong_paddleWidth = pong_canvas.width * 20 / 1000;
    pong_paddleHeight = pong_canvas.height / 6;
    pong_ballRadius = pong_canvas.width / 80;
    if (pong_ballY + pong_ballRadius > pong_canvas.height || pong_ballY - pong_ballRadius < 0) {
        pong_ballSpeedY = -pong_ballSpeedY;
    }

    if (pong_ballX - pong_ballRadius < pong_paddleWidth && pong_ballY > pong_player1Y && pong_ballY < pong_player1Y + pong_paddleHeight)
        pong_ballSpeedX = -pong_ballSpeedX;

    if (pong_ballX + pong_ballRadius > pong_canvas.width - pong_paddleWidth && pong_ballY > pong_player2Y && pong_ballY < pong_player2Y + pong_paddleHeight)
        pong_ballSpeedX = -pong_ballSpeedX;

    if (pong_ballX - pong_ballRadius < 0) {
        pong_resetBall();
    }

    if (pong_ballX + pong_ballRadius > pong_canvas.width) {
        pong_resetBall();
    }
    pong_player1Y = pong_ballY - pong_paddleHeight / 2;
    pong_player2Y = pong_player1Y;
    if (pong_player1Y < 0)
        pong_player1Y = 0;
    if (pong_player2Y < 0)
        pong_player2Y = 0;
    if (pong_player1Y + pong_paddleHeight > pong_canvas.height)
        pong_player1Y = pong_canvas.height - pong_paddleHeight;
    if (pong_player2Y + pong_paddleHeight > pong_canvas.height)
        pong_player2Y = pong_canvas.height - pong_paddleHeight;
}

function pong_resetBall() {
    if (!pong_canvas) {
        return ;
    }
    pong_ballX = pong_canvas.width / 2;
    pong_ballY = pong_canvas.height / 2;
    pong_speed = Math.sqrt(pong_ballSpeedX * pong_ballSpeedX + pong_ballSpeedY * pong_ballSpeedY);

    let angle: number;
    if (Math.random() < 0.5) {
        angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
    }
    else {
        angle = Math.random() * (Math.PI / 2) + (3 * Math.PI) / 4;
    }

    pong_ballSpeedX = pong_speed * Math.cos(angle);
    pong_ballSpeedY = pong_speed * Math.sin(angle);
}


function pong_gameLoop() {
	if (!pong_ctx) {
		return;
	}
    pong_update();
    pong_draw();
    requestAnimationFrame(pong_gameLoop);
}

function animation_pong_stop() {
	pong_ctx = null;
	pong_canvas = null;
}