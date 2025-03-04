console.log("game2.js chargé");

declare function navigateTo(page: string, addHistory: boolean, classement:  { username: string; score: number }[] | null): void;
declare function get_user(): Promise<string | null>;

let game2_mystatus = "online";

let game2_player_id = 0;

let game2_id_tournament: number = 0;

let game2_inTournament:boolean = false;

let game2_lobbyKey: string | null = null;

let game2_socket: WebSocket | null = null;
let game2_Wsocket: WebSocket | null = null;
let game2_Tsocket: WebSocket | null = null;

let game2_disp: boolean = true;
let game2_win: number = 0;

async function play_game2() {
    game2_Disconnect_from_game();
    const user = await get_user();

    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "inqueue"})
    });
    game2_mystatus = "inqueue";
    const sock_name = window.location.host;
    game2_Wsocket = new WebSocket("wss://" + sock_name + "/ws/matchmaking/game2");
    game2_Wsocket.onopen = () => {
        console.log("✅ WebSocket waiting connectée !");
        game2_Wsocket?.send(JSON.stringify({ username: user }));
    };
    game2_Wsocket.onerror = (event) => {
        console.error("❌ WebSocket waiting erreur :", user);};
    game2_Wsocket.onclose = (event) => {
        console.warn("⚠️ WebSocket waiting fermée :", user);};
    game2_Wsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.success == true) {
            game2_Wsocket?.close();
            game2_player_id = data.player_id;
            game2_lobbyKey = data.lobbyKey;
            game2_initializeGame(data.player1, data.player2, user);
        }
    };
}

async function game2_tournament() {
    game2_Disconnect_from_game();
    const user = await get_user();
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "inqueue"})
    });
    game2_mystatus = "inqueue";
    game2_inTournament = true;
    const sock_name = window.location.host;
    game2_Tsocket = new WebSocket("wss://" + sock_name + "/ws/matchmaking/game2_tournament");
    game2_Tsocket.onopen = () => {
        console.log("✅ WebSocket tournament connectée !");
        game2_Tsocket?.send(JSON.stringify({ username: user, init: true }));
    };
    game2_Tsocket.onerror = (event) => {
        console.error("❌ WebSocket tournament erreur :", user);};
    game2_Tsocket.onclose = (event) => {
        console.warn("⚠️ WebSocket tournament fermée :", user);};
    game2_Tsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        console.log("game2_id_tournament in data: ", data.game2_id_tournament);
        console.log("data: ", data);
        if (data.game2_id_tournament != undefined) {
            console.log("actualise game2_id_tournament");
            game2_id_tournament = data.game2_id_tournament; 
        }
        if (data.end_tournament && data.classementDecroissant) {
            game2_Tsocket?.close();
            navigateTo("end_tournament", true, data.classementDecroissant);
            game2_inTournament = false;
            return ;
        }
        console.log("success: ", data.success);
        if (data.success == true) {
            game2_player_id = data.game2_player_id;
            game2_lobbyKey = data.game2_lobbyKey;
            console.log(`data.player1 : ${data.player1} data.player2 : ${data.player2}, user: ${user}`)
            game2_initializeGame(data.player1, data.player2, user);
        }
    };
}

function game2_end_game(game2_win: number, user: string | null, otheruser: string, myscore: number, otherscore: number,  game2_inTournament: boolean) {
    if (game2_inTournament && (myscore == 3 || otherscore == 3)) { // a changer en 3 c est le score finish
        console.log("endgame on tournament: ", game2_id_tournament);
        game2_Tsocket?.send(JSON.stringify({ game2_id_tournament_key_from_player: game2_id_tournament, username: user, endgame: true, history: {"win": game2_win, myusername: user, "otherusername": otheruser,  "myscore": myscore, "otherscore": otherscore, "gametype": "game2"}}));
        game2_socket?.close();
    }
    else if (myscore == 3 || otherscore == 3) { // a changer en 3 c est le score finish
        console.log("update normal game history"); 
        fetch("/update_history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history:{"win": game2_win, "myusername": user, "otherusername": otheruser, "myscore": myscore, "otherscore": otherscore, "gametype": "game2"}})
        });
    }
    game2_win = 0;
}

function game2_Disconnect_from_game() {
    if (!game2_Wsocket && !game2_socket && !game2_lobbyKey && !game2_Tsocket)
        return;
    game2_Wsocket?.close();
    game2_socket?.close();
    game2_Tsocket?.send(JSON.stringify({ game2_id_tournament_key_from_player: game2_id_tournament, disconnect: true}));
    game2_Tsocket?.close();
    if (game2_mystatus != "online") {
        fetch("/update_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({"status": "online"})
        });
        game2_mystatus = "online";
    }
    game2_socket = null;
    game2_lobbyKey = null;
    game2_id_tournament = 0;
    game2_disp = true;
    game2_win = 0;
}

function game2_initializeGame(user1: string, user2: string, myuser: string | null): void {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("game2Canvas") as HTMLCanvasElement;
	console.log("Canvas trouvé :", canvas);
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"status": "ingame"})
    });
    game2_mystatus = "ingame";
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
        const sock_name = window.location.host
        game2_socket = new WebSocket("wss://" + sock_name + "/ws/game2");
        if (!game2_socket)
            return ;
        game2_socket.onopen = () => {
            console.log("✅ WebSocket connectée !");
            game2_socket?.send(JSON.stringify({ username1: user1, username2: user2, "game2_lobbyKey": game2_lobbyKey, "myuser": myuser}));
        };
        game2_socket.onerror = (event) => {
            console.error("❌ WebSocket erreur :", event);};
        game2_socket.onclose = (event) => {
            game2_socket = null;
            game2_lobbyKey = null;
            game2_disp = true;
            game2_win = 0;
            console.warn("⚠️ WebSocket fermée :", event);
        };
        
        const ballRadius = 10;
        const bonusRadius = 50;

        let gameState = {
            ball: { x: canvas.width / 2, y: canvas.height / 2 },
            paddles: {
                player1: { name: user1, angle: Math.PI, size: 0.08 },
                player2: { name: user2, angle: 0, size: 0.08 }
            },
            goals: { player1: { angle: Math.PI, size: Math.PI / 3 }, player2: { angle: 0, size: Math.PI / 3 } },
            score: { player1: 0, player2: 0 },
            bonus: {tag: null, x: 350, y: 350 },
            playerReady: { player1: false, player2: false }
        };

        game2_socket.onmessage = (event) => {
            let gs = JSON.parse(event.data);
            if (gs.disconnect == true) {
                game2_socket?.close();
            }
            if (gs.start == "start") {
                game2_disp = false;
            }
            else if (gs.start == "stop")
                game2_disp = true;
            if (gs.game2_lobbyKey === game2_lobbyKey) {
                gameState = gs.gameState;
                drawGame();
            }
            if (gs.winner == true) {
                game2_win = 1;
                draw_winner();
            }
            else if (gs.winner == false) {
                game2_win = 2;
                draw_winner();
            }
        };

        document.addEventListener("keydown", (event) => {
            if (game2_socket?.readyState === WebSocket.OPEN) {
                let message: { player?: number; move?: string; playerReady?: boolean; game2_lobbyKey?: string | null} | null = null;
        
                if (event.key === "ArrowUp") {
                    message = { player: game2_player_id, move: "up", "game2_lobbyKey": game2_lobbyKey };
                }
                if (event.key === "ArrowDown") {
                    message = { player: game2_player_id, move: "down", "game2_lobbyKey": game2_lobbyKey};
                }
                if (event.key === "ArrowRight") {
                    message = { player: game2_player_id, move: "right", "game2_lobbyKey": game2_lobbyKey };
                }
                if (event.key === "ArrowLeft") {
                    message = { player: game2_player_id, move: "left", "game2_lobbyKey": game2_lobbyKey };
                } 
                if (event.key === " ") {
                    game2_win = 0;
                    message = { playerReady: true, player: game2_player_id, "game2_lobbyKey": game2_lobbyKey };
                }

                if (message) {
                    game2_socket?.send(JSON.stringify(message));
                }
            }
        });

        document.addEventListener("keyup", (event) => {
            if (game2_socket?.readyState === WebSocket.OPEN) {
                let message: { player?: number; move?: string; game?: string; game2_lobbyKey?: string | null } | null = null;

                if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    message = { player: game2_player_id, move: "stop", "game2_lobbyKey": game2_lobbyKey  };
                }

                if (message) {
                    game2_socket.send(JSON.stringify(message));
                }
            }
        });        

        function drawGame(): void {
            if (!ctx) {
                return ;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            //ARENA
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 5, 0, Math.PI * 2);
            ctx.lineWidth = 5;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.closePath();

            //GOAL 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 5,
                gameState.goals.player1.angle - gameState.goals.player1.size / 2,
                gameState.goals.player1.angle + gameState.goals.player1.size / 2
            );
            ctx.lineWidth = 5;
            ctx.strokeStyle = "red";
            ctx.stroke();
            ctx.closePath();

            //GOAL 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 5,
                gameState.goals.player2.angle - gameState.goals.player2.size / 2,
                gameState.goals.player2.angle + gameState.goals.player2.size / 2
            );
            ctx.lineWidth = 5;
            ctx.strokeStyle = "blue";
            ctx.stroke();
            ctx.closePath();

            //BALL
            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFF00";
            ctx.fill();
            ctx.closePath();

            //PADDLE 1
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 19,
                gameState.paddles.player1.angle - Math.PI * gameState.paddles.player1.size,
                gameState.paddles.player1.angle + Math.PI * gameState.paddles.player1.size
            );
            ctx.strokeStyle = "red";
            ctx.lineWidth = 20
            ctx.stroke();
            ctx.closePath();

            //PADDLE 2
            ctx.beginPath();
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2 - 19,
                gameState.paddles.player2.angle - Math.PI * gameState.paddles.player2.size,
                gameState.paddles.player2.angle + Math.PI * gameState.paddles.player2.size
            );
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 20
            ctx.stroke();
            ctx.closePath();

            //BONUS
            if (gameState.bonus.tag == 'P') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x, gameState.bonus.y, bonusRadius, 0, Math.PI * 2);
                ctx.fillStyle = "green";
                ctx.fill();
                ctx.closePath();
            }
            if (gameState.bonus.tag == 'G') {
                ctx.beginPath();
                ctx.arc(gameState.bonus.x, gameState.bonus.y, bonusRadius, 0, Math.PI * 2);
                ctx.fillStyle = "pink";
                ctx.fill();
                ctx.closePath();
            }

            draw_score();
            draw_winner();
            if (game2_disp == true) {
                ctx.font = "30px Arial";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
        }
        requestAnimationFrame(drawGame);

        function draw_score(): void {
            if (!ctx) {
                return ;
            }
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = "40px Arial";
            ctx.fillStyle = "#810000";
            ctx.fillText(String(gameState.score.player1), 50, 40);
            // ctx.fillText(String(gameState.paddles.player1.name), canvas.width / 2 - 200, 40);
            ctx.fillStyle = "#00009c";
            ctx.fillText(String(gameState.score.player2), canvas.width - 50, 40);
            // ctx.fillText(String(gameState.paddles.player2.name), canvas.width / 2 + 200, 40);
        }

        function draw_winner(): void {
            if (!ctx) {
                return ;
            }
            if (game2_win == 1) {
                ctx.textAlign = "start";
                ctx.textBaseline = "alphabetic";
                ctx.font = "40px Arial";
                ctx.fillStyle = "#008100";
                ctx.fillText(String("YOU WIN!"), canvas.width / 2 - 100, canvas.height / 2 - 50);
            }
            if (game2_win == 2) {
                ctx.textAlign = "start";
                ctx.textBaseline = "alphabetic";
                ctx.font = "40px Arial";
                ctx.fillStyle = "#810000";
                ctx.fillText(String("YOU LOSE!"), canvas.width / 2 - 100, canvas.height / 2 - 50);
            }
            if (game2_player_id == 1 && game2_win != 0) {
                console.log(game2_player_id);
                game2_end_game(game2_win, gameState.paddles.player1.name, gameState.paddles.player2.name, gameState.score.player1, gameState.score.player2, game2_inTournament);
            }
            else if (game2_player_id == 2 && game2_win != 0) {
                console.log(game2_player_id);
                game2_end_game(game2_win, gameState.paddles.player2.name, gameState.paddles.player1.name, gameState.score.player2, gameState.score.player1, game2_inTournament);
            }
        }
    } 
    else {
        console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}

window.addEventListener("beforeunload", () => {
    if (game2_Tsocket?.readyState === WebSocket.OPEN) {
        game2_Tsocket?.send(JSON.stringify({ game2_id_tournament_key_from_player: game2_id_tournament, disconnect: true}));
    }
});
