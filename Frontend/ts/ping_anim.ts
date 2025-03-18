console.log("ping_anim.js chargé");

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

let ping_ballSpeedX: number = 1.5; 
let ping_ballSpeedY: number = 1.5;
let ping_speed: number  = 0;

let lastBounce: number = 0;

function initializeAnimationPing() {
    ping_canvas = document.getElementById("ping_animation") as HTMLCanvasElement;
    ping_ctx = ping_canvas.getContext("2d");
	if (ping_ctx) {
        ping_canvas.width = ping_canvas.clientWidth;
        ping_canvas.height = ping_canvas.clientHeight;
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
    // if (lim_sup_player1 > 2 * Math.PI)
    //     lim_sup_player1 -= 2 * Math.PI;

    let lim_inf_player2 = ping_p2_angle - ping_paddle_size;
    if (lim_inf_player2 < 0)
        lim_inf_player2 += 2 * Math.PI;

    let lim_sup_player2 = ping_p2_angle + ping_paddle_size;
    // if (lim_sup_player2 > 2 * Math.PI)
    //     lim_sup_player2 -= 2 * Math.PI;

    function bounce() {
        lastBounce = Date.now() + bounceInterval;
        let normalX = dx / ball_dist;
        let normalY = dy / ball_dist;
    
        let dotProduct = (ping_ballSpeedX * normalX + ping_ballSpeedY * normalY);
    
        ping_ballSpeedX -= 2 * dotProduct * normalX;
        ping_ballSpeedY -= 2 * dotProduct * normalY;
    }

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

    if (ping_ballSpeedX > 10)
        ping_ballSpeedX = 10;
    if (ping_ballSpeedX < -10)
        ping_ballSpeedX = -10;
    if (ping_ballSpeedY > 10)
        ping_ballSpeedY = 10;
    if (ping_ballSpeedY < -10)
        ping_ballSpeedY = -10;

    let lim_inf_goal1 = ping_p1_goal - ping_goal_size / 2;
    if (lim_inf_goal1 < 0)
        lim_inf_goal1 += 2 * Math.PI;

    let lim_sup_goal1 = ping_p1_goal + ping_goal_size / 2;
    if (lim_inf_goal1 > 2 * Math.PI)
        lim_inf_goal1 -= 2 * Math.PI;

    let lim_inf_goal2 = ping_p2_goal - ping_goal_size / 2;
    if (lim_inf_goal2 < 0)
        lim_inf_goal2 += 2 * Math.PI;

    let lim_sup_goal2 = ping_p2_goal + ping_goal_size / 2;
    if (lim_inf_goal2 > 2 * Math.PI)
        lim_inf_goal2 -= 2 * Math.PI;

    if (Date.now() > lastBounce && ball_dist + ping_ballRadius + 5 > ping_arena_radius) {
        if (lim_inf_goal1 < lim_sup_goal1) {
            if (ball_angle >= lim_inf_goal1 && ball_angle <= lim_sup_goal1) {
                ping_resetBall();
                ping_resetParam();
            }
        }
        else {
            if (ball_angle >= lim_inf_goal1 || ball_angle <= lim_sup_goal1) {
                ping_resetBall();
                ping_resetParam();
            } 
        }
    }
 
    if (Date.now() > lastBounce && ball_dist + ping_ballRadius + 5 > ping_arena_radius) {
        if (lim_inf_goal2 < lim_sup_goal2) {
            if (ball_angle >= lim_inf_goal2 && ball_angle <= lim_sup_goal2) {
                ping_resetBall();
                ping_resetParam();
            }
        }
        else {
            if (ball_angle >= lim_inf_goal2 || ball_angle <= lim_sup_goal2) {
                ping_resetBall();
                ping_resetParam();
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

function ping_resetParam() {
    ping_p1_angle = Math.PI;
    ping_p2_angle = 0;
    ping_p1_goal = Math.PI;
    ping_p2_goal = 0;
    lastBounce = Date.now();
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
    ping_ballSpeedX = 1.5;
    ping_ballSpeedY = 1.5;
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
	ping_ctx.shadowBlur = 5;
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
		ping_canvas.width / 2 - ping_paddle_thickness,
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
		ping_canvas.width / 2 - ping_paddle_thickness,
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