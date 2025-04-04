console.log("solo_ping.js chargé");

document.addEventListener("keydown", (event) => {
    if (window.location.pathname === "/solo_ping") {
        if (event.key === "h")
            document.getElementById("div_ping_solo_help")?.classList.toggle("hidden");  
    }
});

function soloping_initializeGame(): void {
    console.log("Initialisation du jeu...");
    let solo_score = document.getElementById("solo_score") as HTMLDataElement;
    const canvas = document.getElementById("solopingCanvas") as HTMLCanvasElement;
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "ingame"})
    });
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
        const btnstart = document.getElementById("btnStartsolo");
        btnstart?.addEventListener("click", () => new_solo_game());
        const btnUp = document.getElementById("btnUpsolo");
        btnUp?.addEventListener("mousedown", () => move_mobile_soloping("left"));
        btnUp?.addEventListener("mouseup", () => move_mobile_soloping("stop"));
        btnUp?.addEventListener("touchstart", () => move_mobile_soloping("left"));
        btnUp?.addEventListener("touchend", () => move_mobile_soloping("stop"));
        
        const btnDown = document.getElementById("btnDownsolo");
        btnDown?.addEventListener("mousedown", () => move_mobile_soloping("right"));
        btnDown?.addEventListener("mouseup", () => move_mobile_soloping("stop"));
        btnDown?.addEventListener("touchstart", () => move_mobile_soloping("right"));
        btnDown?.addEventListener("touchend", () => move_mobile_soloping("stop"));
        
        let canvasWidth: number = canvas.offsetWidth;
        let canvasHeight: number = canvas.offsetHeight;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        let ratio: number = canvasWidth / 1000;
        
        const PING_image = new Image();
        PING_image.src = "Frontend/assets/PING.png";
        
        const PONG_image = new Image();
        PONG_image.src = "Frontend/assets/PONG.png";
        
        animation_ping_stop();
        animation_pong_stop();
        
		const arena_radius = canvasWidth / 2;
        const ballRadius = 10;
        const bonusRadius = 50;
        const move = Math.PI / 50;
        const paddle_thickness = 15;
        const bonus_set = "PPGGS";
        let bonus_glowing: number = 0;
        let up_down: boolean = true;
        
        let ball: {x:number, y: number, speedX: number, speedY: number} = {x: arena_radius, y: arena_radius, speedX: 4.5, speedY: 4.5}
		let speed: number = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
        let player: {angle: number, size: number, move: {up: boolean, down: boolean, right: boolean, left: boolean}} = { angle: Math.PI, size: Math.PI * 0.08, move: {up: false, down: false, right: false, left: false} }
        let goal: {angle: number, size: number, protected: boolean} = { angle: Math.PI, size: Math.PI / 3, protected: false }
        let bonus: { tag: string | null; x: number; y: number } = { tag: null, x: arena_radius, y: arena_radius };
		let last_bounce: number = Date.now();
		let bounceInterval: number = 500;
		let bounce: number = 0;
        let start_solo: boolean = false;
        let end_solo: boolean = false;
        let solo_bonus_bool: number = 0;
        let score: number = 0;
        let draw_bounce: boolean = false;
        let image_bounce_refresh: number = 0;
        let x_bounce: number = 0;
        let y_bounce: number = 0;
        let sending:boolean = false;
        
        document.addEventListener("keydown", (event) => {
            
            if (event.key === "ArrowUp") {
                player.move.up = true;
                player.move.down = false;
                player.move.right = false;
                player.move.left = false;
            }
            if (event.key === "ArrowDown") {
                player.move.up = false;
                player.move.down = true;
                player.move.right = false;
                player.move.left = false;
            }
            if (event.key === "ArrowRight") {
                player.move.up = false;
                player.move.down = false;
                player.move.right = true;
                player.move.left = false;
            }
            if (event.key === "ArrowLeft") {
                player.move.up = false;
                player.move.down = false;
                player.move.right = false;
                player.move.left = true;
            } 
            if (event.key === " ") {
                new_solo_game();
            }
        });
        
        document.addEventListener("keyup", (event) => {
            
            if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
                player.move.up = false;
                player.move.down = false;
                player.move.right = false;
                player.move.left = false;
            }
        });
        
        function solo_drawGame(): void {
            if (!ctx) {
                return ;
            }
            let canvasWidth: number = canvas.offsetWidth;
            let canvasHeight: number = canvas.offsetHeight;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            let arena_radius: number = canvasWidth / 2 - canvasWidth / 20;
            let scale = arena_radius / (canvasWidth / 2);
            
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            ctx.scale(scale, scale);
            
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            //GOAL
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2,
                goal.angle - goal.size / 2,
                goal.angle + goal.size / 2
            );
            if (goal.protected == true) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00CDFF";
            }
            ctx.lineWidth = 5 * ratio;
            ctx.strokeStyle = "red";
            ctx.stroke();
            ctx.stroke();
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(goal.angle - goal.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(goal.angle - goal.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(goal.angle + goal.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(goal.angle + goal.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;
            
            //BALL
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#efb60a";
            ctx.fill(); 
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            
            //PADDLE
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                Math.max(0, canvas.width / 2 - (19 * ratio)),
                player.angle - player.size,
                player.angle + player.size
            );
            ctx.lineWidth = 20 * ratio;
            ctx.strokeStyle = "black";
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(player.angle - player.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(player.angle - player.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(player.angle - player.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(player.angle - player.size)
            );
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(player.angle + player.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(player.angle + player.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(player.angle + player.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(player.angle + player.size)
            );
            ctx.lineWidth = 8 * ratio;
            ctx.stroke();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                Math.max(0, canvas.width / 2 - (19 * ratio)),
                player.angle - player.size,
                player.angle + player.size
            );
            ctx.strokeStyle = "red";
            ctx.lineWidth = 15 * ratio;
            ctx.stroke();
            ctx.closePath();
            
            //BONUS
            if (bonus.tag == 'P') {
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#00E100";
                if (up_down == true) {
                    bonus_glowing++;
                    if (bonus_glowing == 150)
                        up_down = false;
                }
                if (up_down == false) {
                    bonus_glowing--;
                    if (bonus_glowing == 0)
                        up_down = true;
                }     
                ctx.shadowBlur +=  Math.floor(15 + bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            if (bonus.tag == 'G') {
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#FC00C6";
                if (up_down == true) {
                    bonus_glowing++;
                    if (bonus_glowing == 150)
                        up_down = false;
                }
                if (up_down == false) {
                    bonus_glowing--;
                    if (bonus_glowing == 0)
                        up_down = true;
                }     
                ctx.shadowBlur += Math.floor(15 + bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            
            if (bonus.tag == 'S') {
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(bonus.x, bonus.y, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#00CDFF";
                if (up_down == true) {
                    bonus_glowing++;
                    if (bonus_glowing == 150)
                        up_down = false;
                }
                if (up_down == false) {
                    bonus_glowing--;
                    if (bonus_glowing == 0)
                        up_down = true;
                }     
                ctx.shadowBlur += Math.floor(15 + bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            
            if (draw_bounce == true) {
                let image: HTMLImageElement = PING_image;
                if (bounce % 2 == 0)
                    image = PING_image;
                else if (bounce % 2 != 0)
                    image = PONG_image;
                let image_size: number = 100 * ratio;
                ctx.drawImage(image, (x_bounce - image_size / 2), (y_bounce - image_size / 2), image_size, image_size);
                image_bounce_refresh++;
                if (image_bounce_refresh == 60) {
                    draw_bounce = false;
                    image_bounce_refresh = 0;
                }
            }
            
            if (start_solo == false) {
                ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
        }

        
        function move_mobile_soloping(input: string) {
            if (input === "left") {
                player.move.up = false;
                player.move.down = false;
                player.move.right = false;
                player.move.left = true;
            }
            else if (input === "right") {
                player.move.up = false;
                player.move.down = false;
                player.move.right = true;
                player.move.left = false;
            } else {
                player.move.up = false;
                player.move.down = false;
                player.move.right = false;
                player.move.left = false;
            }
        }
        
        function solo_update(): void {
            if (!ctx)
                return;
            ball.x += ball.speedX;
            ball.y += ball.speedY;
            
            if (ball.speedX > 10)
                ball.speedX = 10;
            if (ball.speedX < -10)
                ball.speedX = -10;
            if (ball.speedY > 10)
                ball.speedY = 10;
            if (ball.speedY < -10)
                ball.speedY = -10;
            
            let dx: number = ball.x - arena_radius;
            let dy: number = ball.y - arena_radius;
            let ball_dist: number = Math.sqrt(dx * dx + dy * dy);
            let ball_angle: number = Math.atan2(ball.y - arena_radius, ball.x - arena_radius);
            if (ball_angle < 0)
                ball_angle += 2 * Math.PI;

            //MOVE PADDLE
            if (player.move.up || player.move.left) {
                player.angle -= move;
            }
            if (player.move.down || player.move.right) {
                player.angle += move;
            }
            if (player.angle > 2 * Math.PI)
                player.angle -= 2 * Math.PI;
            if (player.angle < 0)
                player.angle += 2 * Math.PI;

            //BOUNCES
            let lim_inf_player: number = player.angle - player.size;
            if (lim_inf_player < 0)
                lim_inf_player += 2 * Math.PI;
            let lim_sup_player: number = player.angle + player.size;
            if (ball_dist + ballRadius + paddle_thickness > arena_radius - paddle_thickness && Date.now() > last_bounce) {
                if (lim_inf_player < lim_sup_player) {
                    if (ball_angle >= lim_inf_player && ball_angle <= lim_sup_player) {
                        last_bounce = Date.now() + bounceInterval;
                        bounce++;
                        let impactFactor: number = (ball_angle - player.angle) / player.size;
                        let bounceAngle: number = impactFactor * Math.PI / 4;
                        speed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
                        ball.speedX = speed * Math.cos(ball_angle + bounceAngle) * -1.1;
                        ball.speedY = speed * Math.sin(ball_angle + bounceAngle) * -1.1;
                        goal.angle = Math.random() * 2 * Math.PI;
                        player.size -= 0.01 * Math.PI;
                        if (player.size < 0.03 * Math.PI)
                            player.size = 0.03 * Math.PI;
                        score += player.size * speed * 5;
                    }
                }
                else {
                    if (ball_angle >= lim_inf_player || ball_angle <= lim_sup_player) {
                        last_bounce = Date.now() + bounceInterval;
                        bounce++;
                        let impactFactor: number = (ball_angle - player.angle) / player.size;
                        let bounceAngle: number = impactFactor * Math.PI / 4;
                        speed = Math.sqrt(ball.speedX ** 2 + ball.speedY ** 2);
                        ball.speedX = speed * Math.cos(ball_angle + bounceAngle) * -1.1;
                        ball.speedY = speed * Math.sin(ball_angle + bounceAngle) * -1.1;
                        goal.angle = Math.random() * 2 * Math.PI;
                        player.size -= 0.01 * Math.PI;
                        if (player.size < 0.03 * Math.PI)
                            player.size = 0.03 * Math.PI;
                        score += player.size * speed * 5;
                    }
                }
            }
            let lim_inf_goal: number = goal.angle - goal.size / 2;
            if (lim_inf_goal < 0)
                lim_inf_goal += 2 * Math.PI;
        
            let lim_sup_goal: number = goal.angle + goal.size / 2;
            if (lim_sup_goal > 2 * Math.PI)
                lim_sup_goal -= 2 * Math.PI;
        
            if (goal.protected == false && Date.now() > last_bounce && ball_dist + ballRadius + 5 > arena_radius) {
                if (lim_inf_goal < lim_sup_goal) {
                    if (ball_angle >= lim_inf_goal && ball_angle <= lim_sup_goal) {
                        start_solo = false;
                        end_solo = true;
                        send_score();
                    }
                }
                else {
                    if (ball_angle >= lim_inf_goal || ball_angle <= lim_sup_goal) {
                        start_solo = false;
                        end_solo = true;
                        send_score();
                    } 
                }
            }
        
            if (goal.protected == true && ball_dist + ballRadius + 5 > arena_radius) {
                if (lim_inf_goal < lim_sup_goal) {
                    if (ball_angle >= lim_inf_goal && ball_angle <= lim_sup_goal) {
                        goal.protected = false;
                        last_bounce = Date.now() + bounceInterval;
                        let normalX: number = dx / ball_dist;
                        let normalY: number = dy / ball_dist;
                        let dotProduct: number = (ball.speedX * normalX + ball.speedY * normalY);
                        ball.speedX -= 2 * dotProduct * normalX;
                        ball.speedY -= 2 * dotProduct * normalY;
                    }
                }
                else {
                    if (ball_angle >= lim_inf_goal || ball_angle <= lim_sup_goal) {
                        goal.protected = false;
                        last_bounce = Date.now() + bounceInterval;
                        let normalX: number = dx / ball_dist;
                        let normalY: number = dy / ball_dist;
                        let dotProduct: number = (ball.speedX * normalX + ball.speedY * normalY);
                        ball.speedX -= 2 * dotProduct * normalX;
                        ball.speedY -= 2 * dotProduct * normalY;
                    } 
                }
            } 
            if (ball_dist + ballRadius + 5 > arena_radius && Date.now() > last_bounce ) {
                bounce++;
                draw_bounce = true;
                x_bounce = ball.x;
                y_bounce = ball.y;
                last_bounce = Date.now() + bounceInterval;
                let normalX: number = dx / ball_dist;
                let normalY: number = dy / ball_dist;
                let dotProduct: number = (ball.speedX * normalX + ball.speedY * normalY);
                ball.speedX -= 2.05 * dotProduct * normalX;
                ball.speedY -= 2.05 * dotProduct * normalY;
                goal.size += 0.05 * Math.PI;
                if (goal.size >= Math.PI * 2)
                    goal.size = Math.PI;
                score += goal.size * speed * 2;
            }
            bonusManager();
        }

        function bonusManager() {
            function randBonusPos() {
                bonus.x = Math.floor(Math.random() * canvasWidth);
                bonus.y = Math.floor(Math.random() * canvasHeight);
                let dx: number = bonus.x - canvasWidth / 2;
                let dy: number = bonus.y - canvasHeight / 2;
                let bonus_dist = Math.sqrt(dx * dx + dy * dy);
                if (bonus_dist + (200 * ratio) >= arena_radius)
                    randBonusPos();
            }
            if (bounce >= 2 && solo_bonus_bool == 0) {
                solo_bonus_bool = 1;
                let r: string = bonus_set[Math.floor(Math.random() * bonus_set.length)];
                bonus.tag = r;
                randBonusPos();
            }
            if (bounce >= 2 && solo_bonus_bool == 1) {
                let dist_ball_bonus = Math.sqrt(((ball.x - bonus.x) * (ball.x - bonus.x)) + ((ball.y - bonus.y) * (ball.y - bonus.y)));
                if (dist_ball_bonus <= ballRadius + bonusRadius) {
                    score += 1000;
                    if (bonus.tag == 'P') {
                        player.size += Math.PI * 0.03;
                        if (player.size > Math.PI / 2)
                            player.size = Math.PI;
                    }
                    if (bonus.tag == 'G') {
                        goal.size -= Math.PI * 0.2;
                        if (goal.size <= Math.PI / 6 )
                            goal.size = Math.PI / 6;
                    }
                    if (bonus.tag == 'S') {
                        goal.protected = true;
                    }
                    bonus.tag = null;
                    solo_bonus_bool = 0;
                }
            }
        }

        function randBallPos() {
            ball.x = Math.floor(Math.random() * canvasWidth);
            ball.y = Math.floor(Math.random() * canvasHeight);
            let dx = ball.x - canvasWidth / 2;
            let dy = ball.y - canvasHeight / 2;
            let ball_dist = Math.sqrt(dx * dx + dy * dy);
            if (ball_dist + ballRadius + 50 >= arena_radius)
                randBallPos();
        }
        
        function new_solo_game() {
            randBallPos();
            score = 0;
            bounce = 0;
            player.angle = Math.PI;
            player.size = Math.PI * 0.08;
            goal.angle = Math.PI;
            goal.size = Math.PI / 3;
            solo_bonus_bool = 0;
            bonus.tag = null;
            ball.speedX = 4.5;
            ball.speedY = 4.5;
            start_solo = true;
            end_solo = false;
        }

        function solo_loop(): void {
            if (!ctx)
                return;
            if (start_solo == true) {
                solo_update();
            }
            solo_drawGame();
            if (end_solo == true) {
                ctx.font = `bold ${100 * ratio}px 'KaBlam', 'system-ui', sans-serif`;
                ctx.fillStyle = "red";
                ctx.textAlign = "center";
                ctx.fillText(Math.round(score).toString(), canvas.width / 2, canvas.height / 2);
            }
            if (solo_score) {
                solo_score.innerHTML = Math.round(score).toString();
            }
            requestAnimationFrame(solo_loop);
        }
        if (end_solo == false)
            solo_loop();

        async function send_score() {
            if (sending == true)
                return;
            sending = true;
            const player = await get_user();
            try {
                const response = await fetch('/update_solo_score', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ username: player, score: Math.round(score) })
                });
        
                const data = await response.json();
            }
            catch (error) {
                console.log('Error sending score to db', error);
            }
            sending = false;
        }
    } 
    else {
        console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}