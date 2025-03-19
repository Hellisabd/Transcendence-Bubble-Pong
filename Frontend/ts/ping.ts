console.log("ping.js chargé");

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
        console.log("✅ WebSocket waiting connectée !");
        ping_Wsocket?.send(JSON.stringify({ username: user }));
    };
    ping_Wsocket.onerror = (event) => {
        console.error("❌ WebSocket waiting erreur :", user);};
    ping_Wsocket.onclose = (event) => {
        console.warn("⚠️ WebSocket waiting fermée :", user);};
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
        console.log("✅ WebSocket ping tournament connectée !");
        ping_Tsocket?.send(JSON.stringify({ username: user, init: true }));
    };
    ping_Tsocket.onerror = (event) => {
        console.error("❌ WebSocket ping tournament erreur :", user);};
    ping_Tsocket.onclose = (event) => {
        console.warn("⚠️ WebSocket ping tournament fermée :", user);};
    ping_Tsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        console.log("ping_id_tournament in data: ", data.ping_id_tournament);
        console.log("data: ", data);
        if (data.id_tournament != undefined) {
            console.log("actualise ping_id_tournament");
            ping_id_tournament = data.id_tournament; 
        }
        if (data.end_tournament && data.classementDecroissant) {
            ping_Tsocket?.close();
            navigateTo("end_tournament", true, data.classementDecroissant);
            ping_inTournament = false;
            return ;
        }
        console.log("success: ", data.success);
        if (data.success == true) {
            ping_player_id = data.player_id;
            ping_lobbyKey = data.lobbyKey;
            console.log(`data.player1 : ${data.player1} data.player2 : ${data.player2}, user: ${user}`)
            ping_initializeGame(data.player1, data.player2, user);
        }
    };
}

function ping_end_game(ping_win: number, user: string | null, otheruser: string, myscore: number, otherscore: number,  ping_inTournament: boolean) {
    if (ping_inTournament && (myscore == 3 || otherscore == 3)) { // a changer en 3 c est le score finish
        console.log("endgame on tournament: ", ping_id_tournament);
        ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, username: user, endgame: true, history: {"win": ping_win, myusername: user, "otherusername": otheruser,  "myscore": myscore, "otherscore": otherscore, "gametype": "ping"}}));
        ping_socket?.close();
    }
    else if (myscore == 3 || otherscore == 3) { // a changer en 3 c est le score finish
        console.log("update normal game history"); 
        fetch("/update_history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history:{"win": ping_win, "myusername": user, "otherusername": otheruser, "myscore": myscore, "otherscore": otherscore, "gametype": "ping"}})
        });
    }
    ping_win = 0;
}

function ping_Disconnect_from_game() {
    if (window.location.pathname !== "/ping_waiting_room" && window.location.pathname !== "/ping_tournament")
        animation_ping_stop();
    if (!ping_Wsocket && !ping_socket && !ping_lobbyKey && !ping_Tsocket)
        return;
    ping_Wsocket?.close();
    ping_socket?.close();
    ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, disconnect: true}));
    ping_Tsocket?.close();
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
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("pingCanvas") as HTMLCanvasElement;
	console.log("Canvas trouvé :", canvas);
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

        const canvasWidth = canvas.offsetWidth;
        
        canvas.width = canvasWidth;
        canvas.height = canvasWidth;

        animation_ping_stop();
        document.getElementById("ping_animation")?.classList.add("hidden");

        const sock_name = window.location.host
        ping_socket = new WebSocket("wss://" + sock_name + "/ws/ping");
        if (!ping_socket)
            return ;
        ping_socket.onopen = () => {
            console.log("✅ WebSocket connectée !");
            ping_socket?.send(JSON.stringify({ username1: user1, username2: user2, "ping_lobbyKey": ping_lobbyKey, "myuser": myuser}));
        };
        ping_socket.onerror = (event) => {
            console.error("❌ WebSocket erreur :", event);};
        ping_socket.onclose = (event) => {
            ping_socket = null;
            ping_lobbyKey = null;
            ping_disp = true;
            ping_win = 0;
            console.warn("⚠️ WebSocket fermée :", event);
        };
        
        const ballRadius = 10;
        const bonusRadius = 50;

        let gameState = {
            ball: { x: canvas.width / 2, y: canvas.height / 2 },
            paddles: {
                player1: { name: user1, angle: Math.PI, size: Math.PI * 0.08 },
                player2: { name: user2, angle: 0, size: Math.PI * 0.08 }
            },
            goals: { player1: { angle: Math.PI, size: Math.PI / 3, protected: false }, player2: { angle: 0, size: Math.PI / 3, protected: false } },
            score: { player1: 0, player2: 0 },
            bonus: {tag: null, x: 350, y: 350 },
            playerReady: { player1: false, player2: false }
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
            else if (gs.start == "stop")
                ping_disp = true;
            if (gs.ping_lobbyKey === ping_lobbyKey) {
                gameState = gs.gameState;
                drawGame();
            }
            if (gs.winner == true) {
                ping_win = 1;
                draw_winner();
            }
            else if (gs.winner == false) {
                ping_win = 2;
                draw_winner();
            }
        };

        document.addEventListener("keydown", (event) => {
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
        });

        document.addEventListener("keyup", (event) => {
            if (ping_socket?.readyState === WebSocket.OPEN) {
                let message: { player?: number; move?: string; game?: string; ping_lobbyKey?: string | null } | null = null;

                if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    message = { player: ping_player_id, move: "stop", "ping_lobbyKey": ping_lobbyKey  };
                }

                if (message) {
                    ping_socket.send(JSON.stringify(message));
                }
            }
        });

        function drawGame(): void {
            if (!ctx) {
                return ;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let canvasWidth: number = canvas.offsetWidth;
            let canvasHeight: number = canvas.offsetHeight;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            let ratio: number = canvasWidth / 1000;

            //ARENA
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 5, 0, Math.PI * 2);
            ctx.fillStyle = "black";
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 5, 0, Math.PI * 2);
            ctx.lineWidth = 5 * ratio;
            ctx.strokeStyle = "white";
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //GOAL 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 5,
                gameState.goals.player1.angle - gameState.goals.player1.size / 2,
                gameState.goals.player1.angle + gameState.goals.player1.size / 2
            );
            if (gameState.goals.player1.protected == true) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00CDFF";
            }
            ctx.lineWidth = 5 * ratio;
            ctx.strokeStyle = "red";
            ctx.stroke();
            ctx.stroke();
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //GOAL 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 5,
                gameState.goals.player2.angle - gameState.goals.player2.size / 2,
                gameState.goals.player2.angle + gameState.goals.player2.size / 2
            );
            if (gameState.goals.player2.protected == true) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#FF9F00";
            }
            ctx.lineWidth = 5 * ratio;
            ctx.strokeStyle = "blue";
            ctx.stroke();
            ctx.stroke();
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //BALL
            ctx.beginPath();
            ctx.arc(gameState.ball.x * ratio, gameState.ball.y * ratio, ballRadius * ratio, 0, Math.PI * 2);
            ctx.strokeStyle = "yellow";
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //PADDLE 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player1.angle - gameState.paddles.player1.size,
                gameState.paddles.player1.angle + gameState.paddles.player1.size
            );
            ctx.strokeStyle = "red";
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.lineWidth = 20 * ratio;
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //PADDLE 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - (19 * ratio),
                gameState.paddles.player2.angle - gameState.paddles.player2.size,
                gameState.paddles.player2.angle + gameState.paddles.player2.size
            );
            ctx.strokeStyle = "blue";
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.lineWidth = 20 * ratio;
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;

            //BONUS
            if (gameState.bonus.tag == 'P') {
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
                ctx.lineWidth = 20;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
            if (gameState.bonus.tag == 'G') {
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
                ctx.lineWidth = 20;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }

            if (gameState.bonus.tag == 'S') {
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
                ctx.lineWidth = 20;
                ctx.stroke();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }

            draw_score(ratio);
            draw_winner(ratio);
            if (ping_disp == true) {
                ctx.font = `bold ${30 * ratio}px 'Press Start 2P', 'system-ui', sans-serif`;
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
        }
        requestAnimationFrame(drawGame);

        function draw_score(ratio: number): void {
            if (!ctx) {
                return ;
            }
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = `bold ${40 * ratio}px 'Press Start 2P', 'system-ui', sans-serif`;
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
                ctx.textAlign = "center";
                ctx.textBaseline = "alphabetic";
                ctx.font = `bold ${40 * ratio}px 'Press Start 2P', 'system-ui', sans-serif`;
                ctx.fillStyle = "#008100";
                ctx.fillText(String("YOU WIN!"), canvas.width / 2 , canvas.height / 2 - 50);
            }
            if (ping_win == 2) {
                ctx.textAlign = "center";
                ctx.textBaseline = "alphabetic";
                ctx.font = `bold ${40 * ratio}px 'Press Start 2P', 'system-ui', sans-serif`;
                ctx.fillStyle = "#810000";
                ctx.fillText(String("YOU LOSE!"), canvas.width / 2, canvas.height / 2 - 50);
            }
            if (ping_player_id == 1 && ping_win != 0) {
                ping_end_game(ping_win, gameState.paddles.player1.name, gameState.paddles.player2.name, gameState.score.player1, gameState.score.player2, ping_inTournament);
            }
            else if (ping_player_id == 2 && ping_win != 0) {
                ping_end_game(ping_win, gameState.paddles.player2.name, gameState.paddles.player1.name, gameState.score.player2, gameState.score.player1, ping_inTournament);
            }
        }
    } 
    else {
        console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}

window.addEventListener("beforeunload", () => {
    if (ping_Tsocket?.readyState === WebSocket.OPEN) {
        ping_Tsocket?.send(JSON.stringify({ id_tournament_key_from_player: ping_id_tournament, disconnect: true}));
    }
});
