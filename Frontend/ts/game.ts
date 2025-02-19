console.log("game.js chargé");

let player_id = 0;

let lobbyKey: string | null = null;

let socket: WebSocket | null = null;


async function get_user(): Promise<string> {
    try {
        const response = await fetch("/get_user", {
            method: "GET",
            credentials: "include",
        });
        if (!response.ok) {
            return "";
        }
        const data: { success: boolean; username?: string } = await response.json();
        return data.success ? data.username ?? "" : "";
    } catch (error) {
        alert("Erreur: Impossible de récupérer l'utilisateur");
        return "";
    }
}

async function play_pong() {
    const user = await get_user();

    const sock_name = window.location.host
    const Wsocket = new WebSocket("wss://" + sock_name + "/ws/pong/waiting");
    Wsocket.onopen = () => {
        console.log("✅ WebSocket connectée !");
        Wsocket.send(JSON.stringify({ username: user }));
    };
    Wsocket.onerror = (event) => {
        console.error("❌ WebSocket erreur :", event);};
    Wsocket.onclose = (event) => {
        console.warn("⚠️ WebSocket fermée :", event);};
    Wsocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.success == true) {
            Wsocket.close();
            player_id = data.player_id;
            lobbyKey = data.lobbyKey;
            initializeGame(data.player1, data.player2);
        }
    };
}

function Disconnect_from_game() {

    socket?.close();
    socket = null;
    lobbyKey = null;
}


function initializeGame(user1: string, user2: string): void {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
	console.log("Canvas trouvé :", canvas);
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
        const sock_name = window.location.host
        socket = new WebSocket("wss://" + sock_name + "/ws/pong");
        if (!socket)
            return ;
        socket.onopen = () => {
            console.log("✅ WebSocket connectée !");
            socket?.send(JSON.stringify({ username1: user1, username2: user2, "lobbyKey": lobbyKey}));
        };
        socket.onerror = (event) => {
            console.error("❌ WebSocket erreur :", event);};
        socket.onclose = (event) => {
            console.warn("⚠️ WebSocket fermée :", event);};
        
        const paddleWidth = 20;
        const paddleHeight = 100;
        const ballRadius = 10;

        let gameState = {
            ball: { x: 500, y: 250 },
            paddles: {
                player1: { name: user1, y: 200 },
                player2: { name: user2, y: 200 }
            },
            score: { player1: 0, player2: 0 },
            game: { player1: 0, player2: 0 }
        };

        socket.onmessage = (event) => {
            let gs = JSON.parse(event.data);
            if (gs.disconnect == true) {
                socket?.close();
            }
            if (gs.lobbyKey === lobbyKey) {
                gameState = gs.gameState;
                drawGame();
            }
        };

        document.addEventListener("keydown", (event) => {
            if (socket?.readyState === WebSocket.OPEN) {
                let message: { player?: number; move?: string; playerReady?: boolean; lobbyKey?: string | null} | null = null;
        
                if (event.key === "ArrowUp")
                    message = { player: player_id, move: "up", "lobbyKey": lobbyKey };
                if (event.key === "ArrowDown")
                    message = { player: player_id, move: "down", "lobbyKey": lobbyKey};
                if (event.key === " ") {
                    message = { playerReady: true, player: player_id, "lobbyKey": lobbyKey };
                    if (player_id == 1)
                        gameState.game.player1 = 1;
                    if (player_id == 2)
                        gameState.game.player2 = 1;
                }

                if (message) {
                    socket?.send(JSON.stringify(message));
                }
            }
        });

        document.addEventListener("keyup", (event) => {
            if (socket?.readyState === WebSocket.OPEN) {
                let message: { player?: number; move?: string; game?: string; lobbyKey?: string | null } | null = null;

                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    message = { player: player_id, move: "stop", "lobbyKey": lobbyKey  };
                }

                if (message) {
                    socket.send(JSON.stringify(message));
                }
            }
        });        

        function drawGame(): void {
            if (!ctx) {
                return ;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFF00";
            ctx.fill();

            ctx.fillStyle = "#810000";
            ctx.fillRect(0, gameState.paddles.player1.y, paddleWidth, paddleHeight);
            ctx.fillStyle = "#00009c";
            ctx.fillRect(canvas.width - paddleWidth, gameState.paddles.player2.y, paddleWidth, paddleHeight);

            draw_score();
            if (gameState.game.player1 == 0 || gameState.game.player2 == 0) {
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
            ctx.fillText(String(gameState.score.player1), canvas.width / 2 - 50, 40);
            ctx.fillText(String(gameState.paddles.player1.name), canvas.width / 2 - 200, 40);
            ctx.fillStyle = "#00009c";
            ctx.fillText(String(gameState.score.player2), canvas.width / 2 + 50, 40);
            ctx.fillText(String(gameState.paddles.player2.name), canvas.width / 2 + 200, 40);
        }
    } 
    else {
        console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}
