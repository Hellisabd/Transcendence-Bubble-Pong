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

let id_pong_anim: number | null = null; 

function initializeAnimationPong(): void {
    pong_canvas = document.getElementById("pong_animation") as HTMLCanvasElement;
    pong_ctx = pong_canvas.getContext("2d");
    if (pong_ctx) {
        pong_player1Y = pong_canvas.height / 2 - pong_paddleHeight / 2;
        pong_player2Y = pong_canvas.height / 2 - pong_paddleHeight / 2;
       
        if (window.location.pathname === "/waiting_room" || window.location.pathname === "/pong_tournament") { 
            const canvasWidth = pong_canvas.offsetWidth;
            const canvasHeight = pong_canvas.offsetHeight;
            
            pong_canvas.width = canvasWidth;
            pong_canvas.height = canvasHeight;
        }

        pong_ballX = pong_canvas.width / 2;
        pong_ballY = pong_canvas.height / 2;
        pong_ballSpeedX = 1.6;
        pong_ballSpeedY = 1.6;
        pong_speed = Math.sqrt(pong_ballSpeedX * pong_ballSpeedX + pong_ballSpeedY * pong_ballSpeedY);
        pong_resetBall();
        pong_draw(0);
        pong_gameLoop();
    }
}

function pong_draw(ratio: number): void {
    if (!pong_ctx || !pong_canvas) {
      return ;
    }

    pong_ctx.clearRect(0, 0, pong_canvas.width, pong_canvas.height);

    pong_ctx.drawImage(RED_PADDLE, 0, pong_player1Y, pong_paddleWidth, pong_paddleHeight);

    pong_ctx.drawImage(BLUE_PADDLE, pong_canvas.width - pong_paddleWidth, pong_player2Y, pong_paddleWidth, pong_paddleHeight);

    pong_ctx.beginPath();
    pong_ctx.arc(pong_ballX, pong_ballY, pong_ballRadius, 0, Math.PI * 2);
    pong_ctx.fillStyle = "#efb60a";
    pong_ctx.fill(); 
    pong_ctx.lineWidth = 2 * ratio;
    pong_ctx.strokeStyle = "black";
    pong_ctx.stroke();

    if (window.location.pathname === "/waiting_room" || window.location.pathname === "/pong_tournament") { 
        let opacity = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 500));
        pong_ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        pong_ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
        pong_ctx.textAlign = "center";
        pong_ctx.fillText("Waiting for opponent...", pong_canvas.width / 2, pong_canvas.height / 2);
    }    
}

function pong_update(): void {
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

function pong_resetBall(): void {
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

let lastTime_pong: number = 0;

const MIN_FRAME_TIME_PONG = 1000 / 80; 

function pong_gameLoop(now: DOMHighResTimeStamp): void {
	if (!pong_ctx || !pong_canvas) {
		return;
	}
    const delta = now - lastTime_pong;

    if (delta >= MIN_FRAME_TIME_PONG) {
        let canvasWidth: number = pong_canvas.offsetWidth;
        let ratio: number = canvasWidth / 1000;
        pong_update();
        pong_draw(ratio);
        lastTime_pong = now;
    }
    id_pong_anim = requestAnimationFrame(pong_gameLoop);
}

function animation_pong_stop(): void {
    if (id_pong_anim != null) {
        cancelAnimationFrame(id_pong_anim);
        id_pong_anim = null;
    }
	pong_ctx = null;
	pong_canvas = null;
}