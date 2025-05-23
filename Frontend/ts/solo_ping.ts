declare function navigateTo(page: string, addHistory: boolean, classement:  { username: string; score: number }[] | null): void;
declare function get_user(): Promise<string | null>;

let solo_socket: WebSocket | null = null;
let solo_lobbyKey: string | null = null;
let solo_bonus_glowing: number = 0;
let solo_up_down: boolean;
let id_solo_ping: number | null = null; 
let drawing: boolean = true;

function input_down_solo_ping(event: KeyboardEvent) {
    if (event.key === "h")
        document.getElementById("div_ping_solo_help")?.classList.toggle("hidden");
    if (solo_socket?.readyState === WebSocket.OPEN) {
        let message: { player?: number; move?: string; ready?: boolean; solo_lobbyKey?: string | null} | null = null;

        if (event.key === "ArrowUp") {
            message = { move: "up", "solo_lobbyKey": solo_lobbyKey };
        }
        if (event.key === "ArrowDown") {
            message = {move: "down", "solo_lobbyKey": solo_lobbyKey};
        }
        if (event.key === "ArrowRight") {
            message = { move: "right", "solo_lobbyKey": solo_lobbyKey };
        }
        if (event.key === "ArrowLeft") {
            message = { move: "left", "solo_lobbyKey": solo_lobbyKey };
        } 
        if (event.key === " ") {
            message = { ready: true, "solo_lobbyKey": solo_lobbyKey };
            drawing = true;
        }

        if (message) {
            solo_socket?.send(JSON.stringify(message));
        }
    }
}

function input_up_solo_ping(event: KeyboardEvent) {
    if (solo_socket?.readyState === WebSocket.OPEN) {
        let message: { move?: string; solo_lobbyKey?: string | null } | null = null;

        if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
            message = { move: "stop", "solo_lobbyKey": solo_lobbyKey };
        }

        if (message) {
            solo_socket.send(JSON.stringify(message));
        }
    }
}

function move_mobile_soloping(input: string) {
    if (solo_socket?.readyState === WebSocket.OPEN) {
        const message = { move: input, "solo_lobbyKey": solo_lobbyKey };
        solo_socket?.send(JSON.stringify(message));
    }
}

function mobile_ready_solo() {
    if (solo_socket?.readyState === WebSocket.OPEN) {
        const message = { ready: true, "solo_lobbyKey": solo_lobbyKey };
        solo_socket?.send(JSON.stringify(message));
    }
}

async function get_lobby_key() {
    solo_lobbyKey = await get_user();
}

function soloping_initializeGame(): void {

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
        btnstart?.addEventListener("click", () => mobile_ready_solo());
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
        
        let canvasWidth: number  = canvas.offsetWidth;
        let canvasHeight: number = canvas.offsetHeight;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        let ratio: number = canvasWidth / 1000;
        
        const PING_image = new Image();
        PING_image.src = "Frontend/assets/PING.webp";
        
        const PONG_image = new Image();
        PONG_image.src = "Frontend/assets/PONG.webp";
    
        let image_bounce_refresh: number = 0;

        animation_ping_stop();
        animation_pong_stop();

        const sock_name = window.location.host;
        solo_socket = new WebSocket("wss://" + sock_name + "/ws/solo_ping");
        if (!solo_socket)
            return ;
        solo_socket.onopen = () => {
            get_lobby_key();
            solo_socket?.send(JSON.stringify({ "solo_lobbyKey": solo_lobbyKey }));
        };
        solo_socket.onerror = (event) => {};
        solo_socket.onclose = (event) => {
            solo_socket = null;
            solo_lobbyKey = null;
        };
        
        solo_bonus_glowing = 0;
        solo_up_down = true;
        const solo_ballRadius = 15;
        const solo_bonusRadius = 50;
        let arena_radius: number = canvasWidth / 2 - canvasWidth / 20;
        let draw_bounce: boolean = false;
        let x_bounce: number = 0;
        let y_bounce: number = 0;
        let ping_or_pong: number = 0;

        let gameState = {
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
            solo_bonus_bool: 0,
        }

        solo_socket.onmessage = (event) => {
            let gs = JSON.parse(event.data);
            if (gs.disconnect == true) {
                solo_socket?.close();
            }
            if (gs.solo_lobbyKey === solo_lobbyKey) {
                gameState = gs.gameState;
                solo_drawGame();
            }
            else if (gs.draw_bounce == true) {
                draw_bounce = true;
                x_bounce = gs.x_bounce;
                y_bounce = gs.y_bounce;
                ping_or_pong = gs.ping_or_pong;
            }
            if (gs.draw_score == true) {
                let score = gs.score;
                draw_score(ratio, score);
            }
        };
        
        function solo_drawGame(): void {
            if (drawing == false)
                return ;
            if (!ctx) {
                return ;
            }
            solo_score.innerHTML = Math.round(gameState.score).toString();

            let canvasWidth: number = canvas.offsetWidth;
            let canvasHeight: number = canvas.offsetHeight;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            ratio = canvasWidth / 1000;
            
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
                gameState.goal.angle - gameState.goal.size / 2,
                gameState.goal.angle + gameState.goal.size / 2
            );
            if (gameState.goal.protected == true) {
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
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goal.angle - gameState.goal.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goal.angle - gameState.goal.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goal.angle + gameState.goal.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goal.angle + gameState.goal.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;
            
            //solo_ball
            ctx.beginPath();
            ctx.arc(gameState.solo_ball.x * ratio, gameState.solo_ball.y * ratio, solo_ballRadius * ratio, 0, Math.PI * 2);
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
                gameState.player.angle - gameState.player.size,
                gameState.player.angle + gameState.player.size
            );
            ctx.lineWidth = 20 * ratio;
            ctx.strokeStyle = "black";
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.player.angle - gameState.player.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.player.angle - gameState.player.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.player.angle - gameState.player.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.player.angle - gameState.player.size)
            );
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.player.angle + gameState.player.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.player.angle + gameState.player.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.player.angle + gameState.player.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.player.angle + gameState.player.size)
            );
            ctx.lineWidth = 8 * ratio;
            ctx.stroke();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                Math.max(0, canvas.width / 2 - (19 * ratio)),
                gameState.player.angle - gameState.player.size,
                gameState.player.angle + gameState.player.size
            );
            ctx.strokeStyle = "red";
            ctx.lineWidth = 15 * ratio;
            ctx.stroke();
            ctx.closePath();
            
            //BONUS
            if (gameState.bonus.tag == 'P') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#00E100";
                if (solo_up_down == true) {
                    solo_bonus_glowing++;
                    if (solo_bonus_glowing == 150)
                        solo_up_down = false;
                }
                if (solo_up_down == false) {
                    solo_bonus_glowing--;
                    if (solo_bonus_glowing == 0)
                        solo_up_down = true;
                }     
                ctx.shadowBlur +=  Math.floor(15 + solo_bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            if (gameState.bonus.tag == 'G') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#FC00C6";
                if (solo_up_down == true) {
                    solo_bonus_glowing++;
                    if (solo_bonus_glowing == 150)
                        solo_up_down = false;
                }
                if (solo_up_down == false) {
                    solo_bonus_glowing--;
                    if (solo_bonus_glowing == 0)
                        solo_up_down = true;
                }     
                ctx.shadowBlur += Math.floor(15 + solo_bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            
            if (gameState.bonus.tag == 'S') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, solo_bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "#00CDFF";
                if (solo_up_down == true) {
                    solo_bonus_glowing++;
                    if (solo_bonus_glowing == 150)
                        solo_up_down = false;
                }
                if (solo_up_down == false) {
                    solo_bonus_glowing--;
                    if (solo_bonus_glowing == 0)
                        solo_up_down = true;
                }     
                ctx.shadowBlur += Math.floor(15 + solo_bonus_glowing / 5);
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 15 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            
            if (draw_bounce == true) {
                let image: HTMLImageElement = PING_image;
                if (ping_or_pong == 0)
                    image = PING_image;
                else if (ping_or_pong == 1)
                    image = PONG_image;
                let image_size: number = 100 * ratio;
                ctx.drawImage(image, (x_bounce * ratio - image_size / 2), (y_bounce * ratio - image_size / 2), image_size, image_size);
                image_bounce_refresh++;
                if (image_bounce_refresh == 60) {
                    draw_bounce = false;
                    image_bounce_refresh = 0;
                }
            }
            
            if (gameState.start_solo == false) {
                ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
        }
        id_solo_ping = requestAnimationFrame(solo_drawGame);

        function draw_score(ratio: number, score: number): void {
            drawing = false;
            if (!ctx)
                return;
            ctx.font = `bold ${100 * ratio}px 'KaBlam', 'system-ui', sans-serif`;
            ctx.fillStyle = "red";
            ctx.textAlign = "center";
            ctx.fillText(Math.round(score).toString(), canvas.width / 2, canvas.height / 2);
            ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            solo_ping_stop();
        }
    }
}

function solo_Disconnect_from_game() {
    if (solo_socket) {
        fetch("/update_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({"status": "online"})
        });
    }
    if (solo_socket?.readyState != solo_socket?.CLOSING && solo_socket?.readyState != solo_socket?.CLOSED)
        solo_socket?.close();
    solo_socket = null;
    solo_lobbyKey = null;
}

function solo_ping_stop() {
    if (id_solo_ping != null) {
        cancelAnimationFrame(id_solo_ping);
        id_solo_ping = null;
    }
}