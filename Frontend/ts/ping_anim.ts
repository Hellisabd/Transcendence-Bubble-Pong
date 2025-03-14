console.log("ping_anim.js chargé");

let ping_ctx: CanvasRenderingContext2D | null = null;
let ping_canvas: HTMLCanvasElement | null = null;

const ping_ballRadius = 10;
const ping_paddle_size = Math.PI * 0.08;
const ping_goal_size = Math.PI / 3;

let ping_ballX: number = 0;
let ping_ballY: number = 0;
let ping_ball_angle: number = 0;

let ping_p1_angle: number = Math.PI;
let ping_p2_angle: number = 0;

let ping_p1_goal: number = Math.PI;
let ping_p2_goal: number = 0;

let ping_ballSpeedX: number = 3.2; 
let ping_ballSpeedY: number = 3.2;
let ping_speed: number  = 0;


function initializeAnimationPing() {
    ping_canvas = document.getElementById("ping_animation") as HTMLCanvasElement;
    ping_ctx = ping_canvas.getContext("2d");
	if (ping_ctx) {
		ping_p1_angle = Math.PI;
		ping_p2_angle = 0;
		ping_p1_goal = Math.PI;
		ping_p2_goal = 0;
		ping_resetBall();
		ping_gameLoop();
	}
}

function ping_update() {
	if (!ping_canvas || !ping_ctx)
        return ;
	ping_ballX += ping_ballSpeedX;
	ping_ballY += ping_ballSpeedY;
}

function randBallPos() {
	if (!ping_canvas || !ping_ctx)
        return ;
    ping_ballX = Math.floor(Math.random() * ping_canvas.width);
    ping_ballY = Math.floor(Math.random() * ping_canvas.height);
    let dx = ping_ballX - ping_canvas.width / 2;
    let dy = ping_ballY - ping_canvas.height / 2;
    let ball_dist = Math.sqrt(dx * dx + dy * dy);
    if (ball_dist + ping_ballRadius + 50 >= (ping_canvas.width / 2))
        randBallPos();
}

function ping_resetBall() {
    if (!ping_canvas)
        return ;
    randBallPos();
    ping_ballSpeedX = 3.2;
    ping_ballSpeedY = 3.2;
    ping_speed = Math.sqrt(ping_ballSpeedX * ping_ballSpeedX + ping_ballSpeedY * ping_ballSpeedY);
    let angle: number;
    if (Math.random() < 0.5) {
        angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
    }
    else {
        angle = Math.random() * (Math.PI / 2) + (3 * Math.PI) / 4;
    }
    ping_ballSpeedX = ping_speed * Math.cos(angle);
    ping_ballSpeedY = ping_speed * Math.sin(angle);
}


function ping_draw(): void {
	if (!ping_ctx || !ping_canvas) {
		return ;
	}
	ping_ctx.clearRect(0, 0, ping_canvas.width, ping_canvas.height);

	//ARENA
	ping_ctx.beginPath();
	ping_ctx.arc(ping_canvas.width / 2, ping_canvas.height / 2, ping_canvas.width / 2 - 5, 0, Math.PI * 2);
	ping_ctx.fillStyle = "black";
	ping_ctx.fill();
	ping_ctx.closePath();

	ping_ctx.beginPath();
	ping_ctx.arc(ping_canvas.width / 2, ping_canvas.height / 2, ping_canvas.width / 2 - 5, 0, Math.PI * 2);
	ping_ctx.lineWidth = 5;
	ping_ctx.strokeStyle = "white";
	ping_ctx.shadowBlur = 10;
	ping_ctx.shadowColor = ping_ctx.strokeStyle;
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//GOAL 1
	ping_ctx.beginPath();
	ping_ctx.arc(
		ping_canvas.width / 2,
		ping_canvas.height / 2,
		ping_canvas.width / 2 - 5,
		ping_p1_goal - ping_goal_size / 2,
		ping_p1_goal + ping_goal_size / 2
	);
	ping_ctx.lineWidth = 5;
	ping_ctx.strokeStyle = "red";
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//GOAL 2
	ping_ctx.beginPath();
	ping_ctx.arc(
		ping_canvas.width / 2,
		ping_canvas.height / 2,
		ping_canvas.width / 2 - 5,
		ping_p2_goal - ping_goal_size / 2,
		ping_p2_goal + ping_goal_size / 2
	);
	ping_ctx.lineWidth = 5;
	ping_ctx.strokeStyle = "blue";
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//BALL
	ping_ctx.beginPath();
	ping_ctx.arc(ping_ballX, ping_ballY, ping_ballRadius, 0, Math.PI * 2);
	ping_ctx.strokeStyle = "yellow";
	ping_ctx.shadowBlur = 15;
	ping_ctx.shadowColor = ping_ctx.strokeStyle;
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//PADDLE 1
	ping_ctx.beginPath();
	ping_ctx.arc(
		ping_canvas.width / 2,
		ping_canvas.height / 2,
		ping_canvas.width / 2 - 19,
		ping_p1_angle - ping_paddle_size,
		ping_p1_angle + ping_paddle_size
	);
	ping_ctx.strokeStyle = "red";
	ping_ctx.shadowBlur = 15;
	ping_ctx.shadowColor = ping_ctx.strokeStyle;
	ping_ctx.lineWidth = 20
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//PADDLE 2
	ping_ctx.beginPath();
	ping_ctx.arc(
		ping_canvas.width / 2,
		ping_canvas.height / 2,
		ping_canvas.width / 2 - 19,
		ping_p2_angle - ping_paddle_size,
		ping_p2_angle + ping_paddle_size
	);
	ping_ctx.strokeStyle = "blue";
	ping_ctx.shadowBlur = 15;
	ping_ctx.shadowColor = ping_ctx.strokeStyle;
	ping_ctx.lineWidth = 20
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;
}

function ping_gameLoop() {
	if (!ping_ctx) {
		return;
	}
	ping_update();
	ping_draw();
	requestAnimationFrame(ping_gameLoop);
}

function animation_ping_stop() {
	ping_ctx = null;
	ping_canvas = null;
}