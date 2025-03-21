console.log("solo_ping.js chargé");

function soloping_initializeGame(user1: string, user2: string, myuser: string | null): void {
    console.log("Initialisation du jeu...");
    const canvas = document.getElementById("solopingCanvas") as HTMLCanvasElement;
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

		const arena_radius = canvasWidth / 2;
        const ballRadius = 10;
        const bonusRadius = 50;
		let ballx = arena_radius;
		let bally = arena_radius;
		let player_angle = Math.PI;
		let player_size = Math.PI * 0.08;
		let goal_angle = Math.PI;
		let goal_size = Math.PI / 3;
		let goal_protected = false;
		let move_up = false;
		let move_down = false;
		let move_right = false;
		let move_left = false;
		let ballSpeedX = 3.8;
		let ballSpeedY = 3.8;
		let speed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2);
		let bonus_tag = null;
		let bonus_x = arena_radius;
		let bonus_y = arena_radius;
		let last_bounce = Date.now();
		let bounceInterval = 500;
		let bounce = 0;

        document.addEventListener("keydown", (event) => {
        
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
