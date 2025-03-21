console.log("dashboard.ts charger")

let general_ctx: CanvasRenderingContext2D | null = null;
let pong_stats_ctx: CanvasRenderingContext2D | null = null;
let ping_stats_ctx: CanvasRenderingContext2D | null = null;
let general_canvas: HTMLCanvasElement | null = null;
let pong_stats_canvas: HTMLCanvasElement | null = null;
let ping_stats_canvas: HTMLCanvasElement | null = null;

async function get_stats(username: string | null): Promise<void> {
	if (!username)
		return ;

	const response = await fetch("/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({username: username})
    });
	const jsonResponse = await response.json();
	console.log("winrate: ", jsonResponse.winrate);

   	general_canvas = document.getElementById("general_stats") as HTMLCanvasElement;
	if (general_canvas) {
        general_ctx = general_canvas.getContext("2d");
        if (!general_ctx) {
            return ;
        }
		draw_cheese(general_canvas.width / 2, general_canvas.height / 2 - 300, "WINRATE", jsonResponse.winrate, general_canvas.width / 8, general_ctx, "green", "red", 30);
		shadow_text("Tournaments won: " + jsonResponse.nbr_of_tournament_won, general_canvas.width / 6, general_canvas.height / 2, 20, "start", general_ctx);
		shadow_text("Average place in tournaments: " + jsonResponse.average_place_in_tournament.toFixed(2), general_canvas.width / 6, general_canvas.height / 2 + 100, 20, "start", general_ctx);
		shadow_text("Average score in tournaments: " + jsonResponse.average_score_in_tournament.toFixed(2), general_canvas.width / 6, general_canvas.height / 2 + 200, 20, "start", general_ctx);
	}

	pong_stats_canvas = document.getElementById("pong_stats") as HTMLCanvasElement;
	if (pong_stats_canvas) {
		pong_stats_ctx = pong_stats_canvas.getContext("2d");
		if (!pong_stats_ctx)
			return;
		draw_cheese(pong_stats_canvas.width / 2, pong_stats_canvas.height / 2 - 300, "WINRATE", jsonResponse.winrate_pong, pong_stats_canvas.width / 8, pong_stats_ctx, "green", "red", 30);
		shadow_text("PONG tournaments won: " + jsonResponse.nbr_of_tournament_won_pong, pong_stats_canvas.width / 6, pong_stats_canvas.height / 2, 20, "start", pong_stats_ctx);
		shadow_text("Average place in PONG tournaments: " + jsonResponse.average_place_in_tournament_pong.toFixed(2), pong_stats_canvas.width / 6, pong_stats_canvas.height / 2 + 100, 20, "start", pong_stats_ctx);
		shadow_text("Average score in PONG tournaments: " + jsonResponse.average_score_in_tournament_pong.toFixed(2), pong_stats_canvas.width / 6, pong_stats_canvas.height / 2 + 200, 20, "start", pong_stats_ctx);
	}
	
	ping_stats_canvas = document.getElementById("ping_stats") as HTMLCanvasElement;
	if (ping_stats_canvas) {
		ping_stats_ctx = ping_stats_canvas.getContext("2d");
		if (!ping_stats_ctx)
			return;
		draw_cheese(ping_stats_canvas.width / 2, ping_stats_canvas.height / 2 - 300, "WINRATE", jsonResponse.winrate_ping, ping_stats_canvas.width / 8, ping_stats_ctx, "green", "red", 30);
		shadow_text("PING tournaments won: " + jsonResponse.nbr_of_tournament_won_ping, ping_stats_canvas.width / 6, ping_stats_canvas.height / 2 - 90, 20, "start", ping_stats_ctx);
		shadow_text("Average place in PING tournaments: " + jsonResponse.average_place_in_tournament_ping.toFixed(2), ping_stats_canvas.width / 6, ping_stats_canvas.height / 2 - 15, 20, "start", ping_stats_ctx);
		shadow_text("Average score in PING tournaments: " + jsonResponse.average_score_in_tournament_ping.toFixed(2), ping_stats_canvas.width / 6, ping_stats_canvas.height / 2 + 60, 20, "start", ping_stats_ctx);
		shadow_text("Average bounce in PING games: " + jsonResponse.average_bounce_per_game.toFixed(2), ping_stats_canvas.width / 6, ping_stats_canvas.height / 2 + 135, 20, "start", ping_stats_ctx);
		shadow_text("Goalrate with : ", ping_stats_canvas.width / 2, ping_stats_canvas.height / 2 + 250, 20, "center", ping_stats_ctx);
		draw_cheese(ping_stats_canvas.width / 6, ping_stats_canvas.height / 2 + 400, "bonus paddle", jsonResponse.goal_after_bonus_paddle, ping_stats_canvas.width / 12, ping_stats_ctx, "#00E100", "black", 15);
		draw_cheese(ping_stats_canvas.width / 6 * 3, ping_stats_canvas.height / 2 + 400, "bonus goal", jsonResponse.goal_after_bonus_goal, ping_stats_canvas.width / 12, ping_stats_ctx, "#FC00C6", "black", 15);
		draw_cheese(ping_stats_canvas.width / 6 * 5, ping_stats_canvas.height / 2 + 400, "bonus shield", jsonResponse.goal_after_bonus_shield, ping_stats_canvas.width / 12, ping_stats_ctx, "#00CDFF", "black", 15);
	}

	function shadow_text(string: string, x: number, y: number, font_size: number, align: CanvasTextAlign, ctx: CanvasRenderingContext2D) {
		if (!ctx)
			return;
		ctx.font = `bold ${font_size}px 'Press Start 2P', 'system-ui', sans-serif`;
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		ctx.textAlign = align;
		ctx.fillText(string, x, y + 5);

		ctx.font = `bold ${font_size}px 'Press Start 2P', 'system-ui', sans-serif`;
		ctx.fillStyle = "white";
		ctx.textAlign = align;
		ctx.fillText(string, x, y);
	}

	function draw_cheese(x: number, y: number, title: string, percent: number, size: number, ctx: CanvasRenderingContext2D, colorA: string, colorB: string, fontsize: number) {
		if (!ctx)
			return;
		ctx.beginPath();
		ctx.arc(
			x,
			y + 5,
			size,
			3 * Math.PI / 2,
			3 * Math.PI / 2 + Math.PI * 2,
			false
		);
		ctx.lineWidth = 50;
		ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
		ctx.stroke();
		ctx.closePath();

		ctx.beginPath();
		ctx.arc(
			x,
			y,
			size,
			3 * Math.PI / 2,
			3 * Math.PI / 2 + Math.PI * 2 * percent / 100,
			false
		);
		ctx.lineWidth = 50;
		ctx.strokeStyle = colorA;
		ctx.stroke();
		ctx.closePath();

		ctx.beginPath();
		ctx.arc(
			x,
			y,
			size,
			3 * Math.PI / 2,
			3 * Math.PI / 2 + Math.PI * 2 * percent / 100,
			true
		);
		ctx.lineWidth = 50;
		ctx.strokeStyle = colorB;
		ctx.stroke();
		ctx.closePath();

		shadow_text(title, x, y - size - size / 3, fontsize, "center", ctx);
		shadow_text(percent.toFixed(2) + "%", x, y + fontsize / 2, fontsize, "center", ctx);
	}
	display_canvas("general");
}

function display_dashboard_menu() {
	// const btn = document.getElementById("dropdownButton");
	const menu = document.getElementById("dropdownMenu");
	
	
	menu?.classList.toggle("hidden");
	
	
	// document.addEventListener("click", (event) => {
	// 	if (!btn.contains(event.target) && !menu.contains(event.target)) {
	// 	menu.classList.add("hidden");
	// 	}
	// });

}

function display_canvas(canva_name: string) {
	
	if (canva_name == "general") {
		if (general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.remove("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
	} else if(canva_name == "ping") {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.remove("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
	} else if (canva_name == "pong") {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.remove("hidden");
	}
}