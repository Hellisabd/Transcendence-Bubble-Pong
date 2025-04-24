declare function navigateTo(page: string, addHistory: boolean, classement:  { username: string; score: number }[] | null): void;
declare function get_user(): Promise<string | null>;

let ping_mystatus = "online";

let ping_player_id = 0;

let ping_id_tournament: number = 0;

let ping_inTournament:boolean = false;

let ping_lobbyKey: string | null = null;

let ping_socket: WebSocket | null = null;
let ping_Wsocket: WebSocket | null = null;
let ping_Tsocket: WebSocket | null = null;

let ping_disp: boolean = true;
let ping_win: number = 0;

let bonus_glowing: number = 0;
let up_down: boolean = true;

let bounce: number = 0;

let bonus_stats: any = null;

function input_down_ping(event: KeyboardEvent){
    if (event.key === "h")
        document.getElementById("div_ping_help")?.classList.toggle("hidden");  
    if (ping_socket?.readyState === WebSocket.OPEN) {
        let message: { player?: number; move?: string; playerReady?: boolean; ping_lobbyKey?: string | null} | null = null;

        if (event.key === "ArrowUp") {
            message = { player: ping_player_id, move: "up", "ping_lobbyKey": ping_lobbyKey };
        }
        if (event.key === "ArrowDown") {
            message = { player: ping_player_id, move: "down", "ping_lobbyKey": ping_lobbyKey};
        }
        if (event.key === "ArrowRight") {
            message = { player: ping_player_id, move: "right", "ping_lobbyKey": ping_lobbyKey };
        }
        if (event.key === "ArrowLeft") {
            message = { player: ping_player_id, move: "left", "ping_lobbyKey": ping_lobbyKey };
        } 
        if (event.key === " " && ping_disp == true) {
            ping_win = 0;
            message = { playerReady: true, player: ping_player_id, "ping_lobbyKey": ping_lobbyKey };
        }

        if (message) {
            ping_socket?.send(JSON.stringify(message));
        }
    }
}

function input_up_ping(event: KeyboardEvent){
    if (ping_socket?.readyState === WebSocket.OPEN) {
        let message: { player?: number; move?: string; game?: string; ping_lobbyKey?: string | null } | null = null;

        if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
            message = { player: ping_player_id, move: "stop", "ping_lobbyKey": ping_lobbyKey  };
        }

        if (message) {
            ping_socket.send(JSON.stringify(message));
        }
    }
}

function display_next_match(match: any) {
    let html: any = document.getElementById("next_match1");
    if (!html)
        return ;
    if (match != "last_match")
        html.innerHTML = `${match[0]} vs ${match[1]}`;
    else
    html.innerHTML = "No More Match";
    html = document.getElementById("next_match2");
    if (!html)
        return ;
    if (match != "last_match")
        html.innerHTML = `${match[2]} vs ${match[3]}`;
    else
    html.innerHTML = "No More Match";
}

async function play_ping() {
    ping_Disconnect_from_game();
    const user = await get_user();

    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "inqueue"})
    });
    ping_mystatus = "inqueue";
    const sock_name = window.location.host;
    ping_Wsocket = new WebSocket("wss://" + sock_name + "/ws/matchmaking/ping");
    ping_Wsocket.onopen = () => {
        ping_Wsocket?.send(JSON.stringify({ username: user }));
    };
    ping_Wsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.success == true) {
            ping_Wsocket?.close();
            ping_player_id = data.player_id;
            ping_lobbyKey = data.lobbyKey;
            ping_initializeGame(data.player1, data.player2, user);
        }
    };
}

function mobile_ready_ping() {
    if (ping_lobbyKey && ping_disp == true) {
        ping_win = 0;
        const message = { playerReady: true, player: ping_player_id, "ping_lobbyKey": ping_lobbyKey }
        ping_socket?.send(JSON.stringify(message))
    }
}

function move_mobile_ping(input: string) {
    if (ping_socket?.readyState === WebSocket.OPEN) {
        const message = { player: ping_player_id, move: input, "ping_lobbyKey": ping_lobbyKey };
        ping_socket?.send(JSON.stringify(message));
    }
}

async function ping_tournament() {
    ping_Disconnect_from_game();
    const user = await get_user();
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "inqueue"})
    });
    ping_mystatus = "inqueue";
    ping_inTournament = true;
    const sock_name = window.location.host;
    ping_Tsocket = new WebSocket("wss://" + sock_name + "/ws/matchmaking/ping_tournament");
    ping_Tsocket.onopen = () => {
        ping_Tsocket?.send(JSON.stringify({ username: user, init: true }));
    };
    ping_Tsocket.onerror = (event) => {
        ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, disconnect: true}))};
    ping_Tsocket.onclose = (event) => {};
    ping_Tsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.id_tournament != undefined) {
            ping_id_tournament = data.id_tournament; 
        }
        if (data.end_tournament && data.classementDecroissant) {
            ping_Tsocket?.close();
            navigateTo("end_tournament", true, data.classementDecroissant);
            ping_inTournament = false;
            return ;
        }
        if (data.success == true) {
            ping_player_id = data.player_id;
            ping_lobbyKey = data.lobbyKey;
            ping_initializeGame(data.player1, data.player2, user);
        }
        if (data.next_match) {
            display_next_match(data.next_match);
        }
    };
}

function ping_end_game(ping_win: number, user: string | null, otheruser: string, myscore: number, otherscore: number,  ping_inTournament: boolean) {
    if (ping_inTournament && (myscore == 3 || otherscore == 3)) {
        ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, username: user, endgame: true, history: {"win": ping_win, myusername: user, "otherusername": otheruser,  "myscore": myscore, "otherscore": otherscore, "gametype": "ping", bounce: bounce, bonus_stats: bonus_stats}}));
        ping_socket?.close();
    }
    else if (myscore == 3 || otherscore == 3) {
        fetch("/update_history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history:{"win": ping_win, "myusername": user, "otherusername": otheruser, "myscore": myscore, "otherscore": otherscore, "gametype": "ping", bounce: bounce, bonus_stats: bonus_stats}})
        });
    }
    ping_win = 0;
}

function ping_Disconnect_from_game() {
    if (window.location.pathname !== "/ping_waiting_room" && window.location.pathname !== "/ping_tournament")
        animation_ping_stop();
    if (!ping_Wsocket && !ping_socket && !ping_lobbyKey && !ping_Tsocket)
        return;
    if (ping_Wsocket?.readyState != ping_Wsocket?.CLOSING && ping_Wsocket?.readyState != ping_Wsocket?.CLOSED)
        ping_Wsocket?.close();
    if (ping_socket?.readyState != ping_socket?.CLOSING && ping_socket?.readyState != ping_socket?.CLOSED)
        ping_socket?.close();
    if (ping_Tsocket?.readyState != ping_Tsocket?.CLOSING && ping_Tsocket?.readyState != ping_Tsocket?.CLOSED) {
        ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, disconnect: true}));
        ping_Tsocket?.close();
    }
    if (ping_mystatus != "online") {
        fetch("/update_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({"status": "online"})
        });
        ping_mystatus = "online";
    }
    ping_socket = null;
    ping_lobbyKey = null;
    ping_id_tournament = 0;
    ping_disp = true;
    ping_win = 0;
}

function ping_initializeGame(user1: string, user2: string, myuser: string | null): void {
    const btnUp = document.getElementById("btnUpping");
    btnUp?.addEventListener("mousedown", () => move_mobile_ping("left"));
    btnUp?.addEventListener("mouseup", () => move_mobile_ping("stop"));
    btnUp?.addEventListener("touchstart", () => move_mobile_ping("left"));
    btnUp?.addEventListener("touchend", () => move_mobile_ping("stop"));

    const btnDown = document.getElementById("btnDownping");
    btnDown?.addEventListener("mousedown", () => move_mobile_ping("right"));
    btnDown?.addEventListener("mouseup", () => move_mobile_ping("stop"));
    btnDown?.addEventListener("touchstart", () => move_mobile_ping("right"));
    btnDown?.addEventListener("touchend", () => move_mobile_ping("stop"));
    const canvas = document.getElementById("pingCanvas") as HTMLCanvasElement;
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "ingame"})
    });
    ping_mystatus = "ingame";
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }

        let canvasWidth: number = canvas.offsetWidth;
        let canvasHeight: number = canvas.offsetHeight;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        let ratio: number = canvasWidth / 1000;

        const PING_image = new Image();
        PING_image.src = "Frontend/assets/PING.webp";

        const PONG_image = new Image();
        PONG_image.src = "Frontend/assets/PONG.webp";

        const RED_GOAL_image = new Image();
        RED_GOAL_image.src = "Frontend/assets/RED_GOAL.webp";

        const BLUE_GOAL_image = new Image();
        BLUE_GOAL_image.src = "Frontend/assets/BLUE_GOAL.webp";

        const WIN_image = new Image();
        WIN_image.src = "Frontend/assets/WIN.webp";

        const LOSE_image = new Image();
        LOSE_image.src = "Frontend/assets/LOSE.webp";

        let image_bounce_refresh: number = 0;
        let image_goal_refresh: number = 0;
        
        animation_ping_stop();
        document.getElementById("ping_animation")?.classList.add("hidden");
        document.getElementById("ping_animation_arena")?.classList.add("hidden");
        document.getElementById("div_ping_anim")?.classList.add("hidden");
        document.getElementById("div_ping_game")?.classList.remove("hidden");

        const sock_name = window.location.host
        ping_socket = new WebSocket("wss://" + sock_name + "/ws/ping");
        if (!ping_socket)
            return ;
        ping_socket.onopen = () => {
            ping_socket?.send(JSON.stringify({ username1: user1, username2: user2, "ping_lobbyKey": ping_lobbyKey, "myuser": myuser}));
        };
        ping_socket.onerror = (event) => {};
        ping_socket.onclose = (event) => {
            ping_socket = null;
            ping_lobbyKey = null;
            ping_disp = true;
            ping_win = 0;
        };

        const ballRadius = 15;
        const bonusRadius = 50;
        let draw_bounce: boolean = false;
        let draw_red_goal: boolean = false;
        let draw_blue_goal: boolean = false;
        let x_bounce: number = 0;
        let y_bounce: number = 0;
        let ping_or_pong: number = 0;
        let x_goal: number = 0;
        let y_goal: number = 0;

        let gameState = {
            ball: { x: canvas.width / 2, y: canvas.height / 2 },
            paddles: {
                player1: { name: user1, angle: Math.PI, size: Math.PI * 0.08 },
                player2: { name: user2, angle: 0, size: Math.PI * 0.08 }
            },
            goals: { player1: { angle: Math.PI, size: Math.PI / 3, protected: false }, player2: { angle: 0, size: Math.PI / 3, protected: false } },
            score: { player1: 0, player2: 0 },
            bonus: {tag: null, x: 350, y: 350 },
            playerReady: { player1: false, player2: false },
            draw_bounce: { draw: false, x: 0, y: 0 }
        };

        function ping_player_one(): string {
            return gameState.paddles.player1.name;
        }
        function ping_player_two(): string {
            return gameState.paddles.player2.name;
        }
      
        const playerOneElement = document.querySelector("#playerOne") as HTMLElement;
        const playerTwoElement = document.querySelector("#playerTwo") as HTMLElement;
        
        playerOneElement.innerText = `${ping_player_one()}`;
        playerTwoElement.innerText = `${ping_player_two()}`;

        ping_socket.onmessage = (event) => {
            let gs = JSON.parse(event.data);
            if (gs.disconnect == true) {
                ping_socket?.close();
            }
            if (gs.start == "start") {
                ping_disp = false;
            }
            else if (gs.start == "stop") {
                ping_disp = true;
                bounce = gs.bounce;
                bonus_stats = gs.bonus_stats;
            }
            if (gs.ping_lobbyKey === ping_lobbyKey) {
                gameState = gs.gameState;
                drawGame();
            }
            if (gs.winner == true) {
                ping_win = 1;
                draw_winner(ratio);
            }
            else if (gs.winner == false) {
                ping_win = 2;
                draw_winner(ratio);
            }
            else if (gs.draw_bounce == true) {
                draw_bounce = true;
                x_bounce = gs.x_bounce;
                y_bounce = gs.y_bounce;
                ping_or_pong = gs.ping_or_pong;
            }
            else if (gs.red_goal == true) {
                draw_red_goal = true;
                x_goal = gs.x_goal;
                y_goal = gs.y_goal;
            }
            else if (gs.blue_goal == true) {
                draw_blue_goal = true;
                x_goal = gs.x_goal;
                y_goal = gs.y_goal;
            }
        };


        function drawGame(): void {
            if (!ctx) {
                return ;
            }
            let canvasWidth: number = canvas.offsetWidth;
            let canvasHeight: number = canvas.offsetHeight;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            let ratio: number = canvasWidth / 1000;

            let arena_radius: number = canvasWidth / 2 - canvasWidth / 20;
            let scale = arena_radius / (canvasWidth / 2);

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        
            ctx.translate(canvas.width / 2, canvas.height / 2);
        
            ctx.scale(scale, scale);
        
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            //GOAL 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2,
                gameState.goals.player1.angle - gameState.goals.player1.size / 2,
                gameState.goals.player1.angle + gameState.goals.player1.size / 2
            );
            if (gameState.goals.player1.protected == true) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00CDFF";
            }
            ctx.lineWidth = 8 * ratio;
            ctx.strokeStyle = "red";
            ctx.stroke();
            ctx.stroke();
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goals.player1.angle - gameState.goals.player1.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goals.player1.angle - gameState.goals.player1.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goals.player1.angle + gameState.goals.player1.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goals.player1.angle + gameState.goals.player1.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //GOAL 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2,
                gameState.goals.player2.angle - gameState.goals.player2.size / 2,
                gameState.goals.player2.angle + gameState.goals.player2.size / 2
            );
            if (gameState.goals.player2.protected == true) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#FF9F00";
            }
            ctx.lineWidth = 8 * ratio;
            ctx.strokeStyle = "blue";
            ctx.stroke();
            ctx.stroke();
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.fillStyle = "blue";
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goals.player2.angle - gameState.goals.player2.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goals.player2.angle - gameState.goals.player2.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.arc((canvas.width / 2 + canvas.width / 2 * Math.cos(gameState.goals.player2.angle + gameState.goals.player2.size / 2)), (canvas.width / 2 + canvas.width / 2 * Math.sin(gameState.goals.player2.angle + gameState.goals.player2.size / 2)), arena_radius / 30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //BALL
            if (ping_disp == false) {
                ctx.beginPath();
                ctx.arc(gameState.ball.x * ratio, gameState.ball.y * ratio, ballRadius * ratio, 0, Math.PI * 2);
                ctx.fillStyle = "#efb60a";
                ctx.fill(); 
                ctx.lineWidth = 2;
                ctx.strokeStyle = "black";
                ctx.stroke();
                ctx.closePath();
            }

            //PADDLE 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player1.angle - gameState.paddles.player1.size,
                gameState.paddles.player1.angle + gameState.paddles.player1.size
            );
            ctx.lineWidth = 20 * ratio;
            ctx.strokeStyle = "black";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.paddles.player1.angle - gameState.paddles.player1.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.paddles.player1.angle - gameState.paddles.player1.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.paddles.player1.angle - gameState.paddles.player1.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.paddles.player1.angle - gameState.paddles.player1.size)
            );
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.paddles.player1.angle + gameState.paddles.player1.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.paddles.player1.angle + gameState.paddles.player1.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.paddles.player1.angle + gameState.paddles.player1.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.paddles.player1.angle + gameState.paddles.player1.size)
            );
            ctx.lineWidth = 8 * ratio;
            ctx.stroke();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player1.angle - gameState.paddles.player1.size,
                gameState.paddles.player1.angle + gameState.paddles.player1.size
            );
            ctx.strokeStyle = "red";
            ctx.lineWidth = 15 * ratio;
            ctx.stroke();
            ctx.closePath();

            //PADDLE 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player2.angle - gameState.paddles.player2.size,
                gameState.paddles.player2.angle + gameState.paddles.player2.size
            );
            ctx.lineWidth = 20 * ratio;
            ctx.strokeStyle = "black";
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.paddles.player2.angle - gameState.paddles.player2.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.paddles.player2.angle - gameState.paddles.player2.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.paddles.player2.angle - gameState.paddles.player2.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.paddles.player2.angle - gameState.paddles.player2.size)
            );
            ctx.moveTo(
                canvas.width / 2 + (canvas.width / 2 - (28 * ratio)) * Math.cos(gameState.paddles.player2.angle + gameState.paddles.player2.size),
                canvas.height / 2 + (canvas.width / 2 - (28 * ratio)) * Math.sin(gameState.paddles.player2.angle + gameState.paddles.player2.size)
            );
            ctx.lineTo(
                canvas.width / 2 + (canvas.width / 2 - (10 * ratio)) * Math.cos(gameState.paddles.player2.angle + gameState.paddles.player2.size),
                canvas.height / 2 + (canvas.width / 2 - (10 * ratio)) * Math.sin(gameState.paddles.player2.angle + gameState.paddles.player2.size)
            );
            ctx.lineWidth = 8 * ratio;
            ctx.stroke();
            ctx.closePath();

            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player2.angle - gameState.paddles.player2.size,
                gameState.paddles.player2.angle + gameState.paddles.player2.size
            );
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 15 * ratio;
            ctx.stroke();
            ctx.closePath();

            //BONUS
            if (gameState.bonus.tag == 'P') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
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
            if (gameState.bonus.tag == 'G') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
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

            if (gameState.bonus.tag == 'S') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 20 * ratio;
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(gameState.bonus.x * ratio, gameState.bonus.y * ratio, bonusRadius * ratio, 0, Math.PI * 2);
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
                let image: HTMLImageElement;
                if (ping_or_pong == 0)
                    image = PING_image;
                else
                    image = PONG_image;
                let image_size: number = 100 * ratio;
                ctx.drawImage(image, (x_bounce - image_size / 2) * ratio, (y_bounce - image_size / 2) * ratio, image_size, image_size);
                image_bounce_refresh++;
                if (image_bounce_refresh == 60) {
                    draw_bounce = false;
                    image_bounce_refresh = 0;
                }
            }
            if (draw_blue_goal == true && ping_win == 0) {
                let image_size: number = 300 * ratio;
                ctx.drawImage(BLUE_GOAL_image, (canvas.width / 2) - image_size / 2, (canvas.height / 2) - image_size / 2, image_size, image_size);
                image_goal_refresh++;
                if (image_goal_refresh == 60) {
                    draw_blue_goal = false;
                    image_goal_refresh = 0;
                }
            }
            if (draw_red_goal == true && ping_win == 0) {
                let image_size: number = 300 * ratio;
                ctx.drawImage(RED_GOAL_image, (canvas.width / 2) - image_size / 2, (canvas.height / 2) - image_size / 2, image_size, image_size);
                image_goal_refresh++;
                if (image_goal_refresh == 60) {
                    draw_red_goal = false;
                    image_goal_refresh = 0;
                }
            }

            draw_score(ratio);
            draw_winner(ratio);
            if (ping_disp == true) {
                document.getElementById("ping_playersdiv")?.classList.remove("hidden");
                ctx.font = `bold ${30 * ratio}px 'Canted Comic', 'system-ui', sans-serif`;
                ctx.fillStyle = "black";
                ctx.textAlign = "center";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + (250 * ratio));
            }
        }
        requestAnimationFrame(drawGame);

        function draw_score(ratio: number): void {
            if (!ctx) {
                return ;
            }
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = `bold ${60 * ratio}px 'KaBlam', 'system-ui', sans-serif`;
            ctx.fillStyle = "red";
            ctx.fillText(String(gameState.score.player1), 50, 40);
            ctx.fillStyle = "blue";
            ctx.fillText(String(gameState.score.player2), canvas.width - 50, 40);
        }

        function draw_winner(ratio: number): void {
            if (!ctx) {
                return ;
            }
            if (ping_win == 1) {
                let image_size: number = 400 * ratio;
                ctx.drawImage(WIN_image, (canvas.width / 2) - image_size / 2, (canvas.height / 2) - image_size / 2, image_size, image_size);
            }
            if (ping_win == 2) {
                let image_size: number = 400 * ratio;
                ctx.drawImage(LOSE_image, (canvas.width / 2) - image_size / 2, (canvas.height / 2) - image_size / 2, image_size, image_size);
            }
            if (ping_player_id == 1 && ping_win != 0) {
                ping_end_game(ping_win, gameState.paddles.player1.name, gameState.paddles.player2.name, gameState.score.player1, gameState.score.player2, ping_inTournament);
            }
            else if (ping_player_id == 2 && ping_win != 0) {
                ping_end_game(ping_win, gameState.paddles.player2.name, gameState.paddles.player1.name, gameState.score.player2, gameState.score.player1, ping_inTournament);
            }
        }
    } 
}