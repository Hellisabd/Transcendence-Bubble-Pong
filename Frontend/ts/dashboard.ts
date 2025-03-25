console.log("dashboard.ts charger")

let canvas_map: any = [];
let general_ctx: CanvasRenderingContext2D | null = null;
let pong_stats_ctx: CanvasRenderingContext2D | null = null;
let ping_stats_ctx: CanvasRenderingContext2D | null = null;
let general_canvas: HTMLCanvasElement | null = null;
let pong_stats_canvas: HTMLCanvasElement | null = null;
let ping_stats_canvas: HTMLCanvasElement | null = null;
let friendContainer: HTMLElement | null = null;

function create_friend_canvas(winrate_per_friend: any, json: any) {
	const containerDiv = document.getElementById("container");
	const friends_menu = document.getElementById("friends-menu");

	if (!containerDiv) return;

	// Créer un canvas pour chaque ami
	for (let i: number = 0; i < winrate_per_friend.length; i++) {
		console.log("create canvas number: ", i);
		const friend = winrate_per_friend[i];
		const canvas = document.createElement("canvas");
		friendContainer = canvas;
		canvas.id = `friend_${friend.username}`;
		canvas.width = 1000;
		canvas.height = 1000;
		canvas.className = "hidden";

		containerDiv.appendChild(canvas);
		const ctx_canva:CanvasRenderingContext2D | null = canvas.getContext("2d");
		console.log(json.winrate_against_friends[0].winrate)
		if (ctx_canva) {
			console.log()
			shadow_text(`Stats against ${friend.username}`, 420, 50, 15, "center", ctx_canva);
			draw_cheese(canvas.width / 3 * 2 + 100, canvas.height / 2 - 300, "WINRATE", json.winrate_against_friends[i].winrate || 0, canvas.width / 8, ctx_canva, "green", "red", 30); 
			draw_cheese(canvas.width / 3 - 50, canvas.height / 2, "WINRATE PONG", json.winrate_against_friends_pong[i].winrate || 0, canvas.width / 8, ctx_canva, "purple", "red", 30);
			draw_cheese(canvas.width / 3 * 2 + 100, canvas.height / 2 + 300, "WINRATE PING", json.winrate_against_friends_ping[i].winrate || 0, canvas.width / 8, ctx_canva, "cyan", "red", 30);
			canvas_map.push({name: `${friend.username}`, canvas: canvas});
			const div = document.createElement("div");
			div.id = `friend_${friend.username}`;
			div.className = "block px-4 py-2 text-white font-secondFont hover:bg-gray-100 dark:hover:bg-gray-700";
			div.setAttribute("onclick", `display_canvas(\"${friend.username}\")`);
			div.innerHTML = `<span>${friend.username}</span>`
			friends_menu?.appendChild(div);
		}
	}
}


async function get_stats(username: string | null): Promise<void> {
	if (!username)
		return ;
	
	const response = await fetch("/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({username: username})
    });
	const jsonResponse = await response.json();
	
	create_friend_canvas(jsonResponse.winrate_against_friends, jsonResponse);
	
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
	display_canvas("general");
}

function display_dashboard_menu() {
	// const btn = document.getElementById("dropdownButton");
	const menu = document.getElementById("dropdownMenu");
	
	menu?.classList.toggle("hidden");
}
		
		
function display_canvas(canva_name: string) {
	let canva_to_display : HTMLCanvasElement | null = null;
	for (let i: number = 0; i < canvas_map.length; i++) {
		if (canvas_map[i].name == canva_name) {
			console.log("caca");
			canva_to_display = canvas_map[i].canvas;
		}
		else {
			canvas_map[i].canvas?.classList.add("hidden");
		}
	}
	canva_to_display?.classList.remove("hidden");
	if (canva_name == "general") {
		console.log("hide other than general");
		if (general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.remove("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
	} else if(canva_name == "ping") {
		console.log("hide other than ping");
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.remove("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
	} else if (canva_name == "pong") {
		console.log("hide other than pong");
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.remove("hidden");
	} else {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
	}
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

function display_friend_menu() {
	const friend_menu = document.getElementById("friends-menu");
	friend_menu?.classList.toggle("hidden");
}

document.addEventListener("click", function(event: MouseEvent) {
	const Menufriends = document.getElementById("friends-menu");
	const MenufriendsButton = document.getElementById("friend-menu-button");

	
	if (!Menufriends?.contains(event.target as Node) && !MenufriendsButton?.contains(event.target as Node)) {
		Menufriends?.classList.add("hidden"); 
	}
});