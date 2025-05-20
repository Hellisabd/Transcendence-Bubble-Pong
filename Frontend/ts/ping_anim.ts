let ping_ctx: CanvasRenderingContext2D | null = null;
let ping_canvas: HTMLCanvasElement | null = null;

let ping_ballRadius = 0;
let ping_paddle_thickness = 0;
let ping_arena_radius = 0;
const ping_paddle_size = Math.PI * 0.08;
const ping_goal_size = Math.PI / 3;
const bounceInterval = 500;
const paddle_speed = Math.PI / 200;

let ping_ballX: number = 0;
let ping_ballY: number = 0;
let ping_ball_angle: number = 0;

let ping_p1_angle: number = Math.PI;
let ping_p2_angle: number = 0;

let ping_p1_goal: number = Math.PI;
let ping_p2_goal: number = 0;

let ping_ballSpeedX: number = 3.5; 
let ping_ballSpeedY: number = 3.5;
let ping_speed: number  = 0;

let lastBounce: number = 0;

let id_ping_anim: number | null = null;

function initializeAnimationPing() {
    ping_canvas = document.getElementById("ping_animation") as HTMLCanvasElement;
    ping_ctx = ping_canvas.getContext("2d");
	if (ping_ctx) {
        ping_canvas.width = ping_canvas.clientWidth;
        ping_canvas.height = ping_canvas.clientHeight;

        if (window.location.pathname === "/ping_waiting_room" || window.location.pathname === "/ping_tournament") { 
            const canvasWidth = ping_canvas.offsetWidth;
            
            ping_canvas.width = canvasWidth;
            ping_canvas.height = canvasWidth;
        }

        ping_ballRadius = ping_canvas.width / 70;
        ping_paddle_thickness = ping_canvas.width * 19 / 700;
        ping_arena_radius = ping_canvas.width / 2;
		ping_p1_angle = Math.PI;
		ping_p2_angle = 0;
		ping_p1_goal = Math.PI;
		ping_p2_goal = 0;
		lastBounce = Date.now();
		ping_resetBall();
		ping_gameLoop();
	}
}

function ping_update() {
	if (!ping_canvas || !ping_ctx)
        return ;
	ping_ballX += ping_ballSpeedX;
	ping_ballY += ping_ballSpeedY;
    ping_ballRadius = ping_canvas.width / 70;
    ping_paddle_thickness = ping_canvas.width * 19 / 700;
    ping_arena_radius = ping_canvas.width / 2;
	let dx = ping_ballX - ping_canvas.width / 2;
    let dy = ping_ballY - ping_canvas.height / 2;
    let ball_dist = Math.sqrt(dx * dx + dy * dy);
    let ball_angle = Math.atan2(ping_ballY - ping_canvas.height / 2, ping_ballX - ping_canvas.width / 2);
    if (ball_angle < 0)
        ball_angle += 2 * Math.PI;

	ping_move_paddles();

	let lim_inf_player1 = ping_p1_angle - ping_paddle_size;
    if (lim_inf_player1 < 0)
        lim_inf_player1 += 2 * Math.PI;

    let lim_sup_player1 = ping_p1_angle + ping_paddle_size;
    if (lim_sup_player1 > 2 * Math.PI)
        lim_sup_player1 -= 2 * Math.PI;

    let lim_inf_player2 = ping_p2_angle - ping_paddle_size;
    if (lim_inf_player2 < 0)
        lim_inf_player2 += 2 * Math.PI;

    let lim_sup_player2 = ping_p2_angle + ping_paddle_size;
    if (lim_sup_player2 > 2 * Math.PI)
        lim_sup_player2 -= 2 * Math.PI;

    function bounce() {
        lastBounce = Date.now() + bounceInterval;
        let normalX = dx / ball_dist;
        let normalY = dy / ball_dist;
    
        let dotProduct = (ping_ballSpeedX * normalX + ping_ballSpeedY * normalY);
    
        ping_ballSpeedX -= 2 * dotProduct * normalX;
        ping_ballSpeedY -= 2 * dotProduct * normalY;
    }

    if (ping_ballSpeedX > 10)
        ping_ballSpeedX = 10;
    if (ping_ballSpeedX < -10)
        ping_ballSpeedX = -10;
    if (ping_ballSpeedY > 10)
        ping_ballSpeedY = 10;
    if (ping_ballSpeedY < -10)
        ping_ballSpeedY = -10;

    if (ball_dist + ping_ballRadius + ping_paddle_thickness > ping_arena_radius - ping_paddle_thickness && Date.now() > lastBounce) {
        if (lim_inf_player1 < lim_sup_player1) {
            if (ball_angle >= lim_inf_player1 && ball_angle <= lim_sup_player1) {
                bounce();
                randGoalPos(1);
            }
        }
        else {
            if (ball_angle >= lim_inf_player1 || ball_angle <= lim_sup_player1) {
                bounce();
                randGoalPos(1);
            }
        }
        if (lim_inf_player2 < lim_sup_player2) {
            if (ball_angle >= lim_inf_player2 && ball_angle <= lim_sup_player2) {
                bounce();
                randGoalPos(2);
            }
        }
        else {
            if (ball_angle >= lim_inf_player2 || ball_angle <= lim_sup_player2) {
                bounce();
                randGoalPos(2);
            }
        }
    }

    if (ball_dist + ping_ballRadius + 5 > ping_arena_radius && Date.now() > lastBounce ) {
        bounce();
    }
}

function ping_move_paddles() {
    ping_p1_angle += paddle_speed;
    ping_p2_angle += paddle_speed;
    if (ping_p1_angle >= 2 * Math.PI)
        ping_p1_angle -= 2 * Math.PI;
    if (ping_p2_angle >= 2 * Math.PI)
        ping_p2_angle -= 2 * Math.PI;
}

function circular_distance(a: number, b: number) {
    return Math.min(Math.abs(a - b), 2 * Math.PI - Math.abs(a - b));
}

function randGoalPos(tag: number) {
    if (tag == 1) {
        ping_p1_goal = Math.random() * 2 * Math.PI;
        if (circular_distance(ping_p1_goal, ping_p2_goal) < ping_goal_size) {
            randGoalPos(1);
        }
    }
    if (tag == 2) {
        ping_p2_goal = Math.random() * 2 * Math.PI;
        if (circular_distance(ping_p2_goal, ping_p1_goal) < ping_goal_size) {
            randGoalPos(2);
        }
    }
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
    ping_ballSpeedX = 3.5;
    ping_ballSpeedY = 5.5;
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


function ping_draw(ratio: number): void {
	if (!ping_ctx || !ping_canvas) {
		return ;
	}
    let ping_canvasWidth: number = ping_canvas.offsetWidth;
    let ping_canvasHeight: number = ping_canvas.offsetHeight;
    
    ping_canvas.width = ping_canvasWidth;
    ping_canvas.height = ping_canvasHeight;

    let arena_radius: number = ping_canvasWidth / 2 - ping_canvasWidth / 20;
    let scale = arena_radius / (ping_canvasWidth / 2);

    ping_ctx.setTransform(1, 0, 0, 1, 0, 0);
    ping_ctx.clearRect(0, 0, ping_canvas.width, ping_canvas.height);

    ping_ctx.translate(ping_canvas.width / 2, ping_canvas.height / 2);

    ping_ctx.scale(scale, scale);

    ping_ctx.translate(-ping_canvas.width / 2, -ping_canvas.height / 2);

	//GOAL 1
	ping_ctx.beginPath();
	ping_ctx.arc(
		ping_canvas.width / 2,
		ping_canvas.height / 2,
		ping_canvas.width / 2,
		ping_p1_goal - ping_goal_size / 2,
		ping_p1_goal + ping_goal_size / 2
	);
	ping_ctx.lineWidth = 8 * ratio;
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
		ping_canvas.width / 2,
		ping_p2_goal - ping_goal_size / 2,
		ping_p2_goal + ping_goal_size / 2
	);
	ping_ctx.lineWidth = 8 * ratio;
	ping_ctx.strokeStyle = "blue";
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.stroke();
	ping_ctx.closePath();
	ping_ctx.shadowBlur = 0;

	//BALL
    ping_ctx.beginPath();
    ping_ctx.arc(ping_ballX, ping_ballY, ping_ballRadius, 0, Math.PI * 2);
    ping_ctx.fillStyle = "#efb60a";
    ping_ctx.fill(); 
    ping_ctx.lineWidth = 2;
    ping_ctx.strokeStyle = "black";
    ping_ctx.stroke();
    ping_ctx.closePath();

	//PADDLE 1
    ping_ctx.beginPath();
    ping_ctx.arc(
        ping_canvas.width / 2,
        ping_canvas.height / 2,
		ping_canvas.width / 2 - (19 * ratio),
		ping_p1_angle - ping_paddle_size,
		ping_p1_angle + ping_paddle_size
    );
    ping_ctx.lineWidth = 20 * ratio;
    ping_ctx.strokeStyle = "black";
    ping_ctx.stroke();

    ping_ctx.beginPath();
    ping_ctx.moveTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.cos(ping_p1_angle - ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.sin(ping_p1_angle - ping_paddle_size)
    );
    ping_ctx.lineTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.cos(ping_p1_angle - ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.sin(ping_p1_angle - ping_paddle_size)
    );
    ping_ctx.moveTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.cos(ping_p1_angle + ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.sin(ping_p1_angle + ping_paddle_size)
    );
    ping_ctx.lineTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.cos(ping_p1_angle + ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.sin(ping_p1_angle + ping_paddle_size)
    );
    ping_ctx.lineWidth = 8 * ratio;
    ping_ctx.stroke();
    ping_ctx.closePath();
    
    ping_ctx.beginPath();
    ping_ctx.arc(
        ping_canvas.width / 2,
        ping_canvas.height / 2,
        ping_canvas.width / 2 - (19 * ratio),
        ping_p1_angle - ping_paddle_size,
        ping_p1_angle + ping_paddle_size
    );
    ping_ctx.strokeStyle = "red";
    ping_ctx.lineWidth = 15 * ratio;
    ping_ctx.stroke();
    ping_ctx.closePath();

    //PADDLE 2
    ping_ctx.beginPath();
    ping_ctx.arc(
        ping_canvas.width / 2,
        ping_canvas.height / 2,
		ping_canvas.width / 2  - (19 * ratio),
		ping_p2_angle - ping_paddle_size,
		ping_p2_angle + ping_paddle_size
    );
    ping_ctx.lineWidth = 20 * ratio;
    ping_ctx.strokeStyle = "black";
    ping_ctx.stroke();
    
    ping_ctx.beginPath();
    ping_ctx.moveTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.cos(ping_p2_angle - ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.sin(ping_p2_angle - ping_paddle_size)
    );
    ping_ctx.lineTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.cos(ping_p2_angle - ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.sin(ping_p2_angle - ping_paddle_size)
    );
    ping_ctx.moveTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.cos(ping_p2_angle + ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (28 * ratio)) * Math.sin(ping_p2_angle + ping_paddle_size)
    );
    ping_ctx.lineTo(
        ping_canvas.width / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.cos(ping_p2_angle + ping_paddle_size),
        ping_canvas.height / 2 + (ping_canvas.width / 2 - (10 * ratio)) * Math.sin(ping_p2_angle + ping_paddle_size)
    );
    ping_ctx.lineWidth = 8 * ratio;
    ping_ctx.stroke();
    ping_ctx.closePath();

    ping_ctx.beginPath();
    ping_ctx.arc(
        ping_canvas.width / 2,
        ping_canvas.height / 2,
        ping_canvas.width / 2 - (19 * ratio),
        ping_p2_angle - ping_paddle_size,
        ping_p2_angle + ping_paddle_size
    );
    ping_ctx.strokeStyle = "blue";
    ping_ctx.lineWidth = 15 * ratio;
    ping_ctx.stroke();
    ping_ctx.closePath();

    if (window.location.pathname === "/ping_waiting_room" || window.location.pathname === "/ping_tournament") { 
        let opacity = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 500));
        ping_ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ping_ctx.font = "30px 'Canted Comic', bold, sans-serif";
        ping_ctx.textAlign = "center";
        ping_ctx.fillText("Waiting for opponent...", ping_canvas.width / 2, ping_canvas.height / 2);
    } 
}

let lastTime_ping: number = 0;

const MIN_FRAME_TIME_PING = 1000 / 80; 

function ping_gameLoop(now: DOMHighResTimeStamp): void {
	if (!ping_ctx || !ping_canvas) {
		return;
	}
    const delta = now - lastTime_ping;

    if (delta >= MIN_FRAME_TIME_PING) {
        let canvasWidth: number = ping_canvas.offsetWidth;
        let ratio: number = canvasWidth / 1000;
        ping_update();
        ping_draw(ratio);
        lastTime_ping = now;
    }
    id_ping_anim = requestAnimationFrame(ping_gameLoop);
}

function animation_ping_stop() {
    if (id_ping_anim != null) {
        cancelAnimationFrame(id_ping_anim);
        id_ping_anim = null;
    }
	ping_ctx = null;
	ping_canvas = null;
}