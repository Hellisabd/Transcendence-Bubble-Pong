console.log("game.js chargé");

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
    initializeGame(user);
}

function initializeGame(user: string): void {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
	console.log("Canvas trouvé :", canvas);
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
        const sock_name = window.location.host
        const socket = new WebSocket("wss://" + sock_name + "/ws/pong");
        socket.onopen = () => {
            console.log("✅ WebSocket connectée !");
            socket.send(JSON.stringify({ username: user}));
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
                player1: { name: "A", y: 200 },
                player2: { name: "B", y: 200 }
            },
            score: { player1: 0, player2: 0 },
            game: { state: 0 }
        };

        socket.onmessage = (event) => {
            let gs = JSON.parse(event.data);
            gameState = gs.gameState;
            drawGame();
        };

        document.addEventListener("keydown", (event) => {
            if (socket.readyState === WebSocket.OPEN) {
                let message: { player?: string; move?: string; game?: string } | null = null;
        
                if (event.key === "ArrowUp")
                    message = { player: "player2", move: "up" };
                if (event.key === "ArrowDown")
                    message = { player: "player2", move: "down" };
                if (event.key === "w")
                    message = { player: "player1", move: "up" };
                if (event.key === "s")
                    message = { player: "player1", move: "down" };
                if (event.key === " ") {
                    message = { game: "new" };
                    gameState.game.state = 1;
                }

                if (message) {
                    socket.send(JSON.stringify(message));
                }
            }
        });

        document.addEventListener("keyup", (event) => {
            if (socket.readyState === WebSocket.OPEN) {
                let message: { player?: string; move?: string; game?: string } | null = null;

                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    message = { player: "player2", move: "stop" };
                }
                if (event.key === "w" || event.key === "s") {
                    message = { player: "player1", move: "stop" };
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
            if (gameState.game.state == 0) {
                ctx.font = "30px Arial";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText("Press SPACE to start", canvas.width / 2, canvas.height / 2 + 100);
            }
            requestAnimationFrame(drawGame);
        }

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

        drawGame();
        } 
        else {
            console.error("Erreur : Le canvas n'a pas été trouvé.");
    }
}
