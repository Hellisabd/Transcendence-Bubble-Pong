
let canvas_map: any = [];
let general_ctx: CanvasRenderingContext2D | null = null;
let pong_stats_ctx: CanvasRenderingContext2D | null = null;
let ping_stats_ctx: CanvasRenderingContext2D | null = null;
let ping_solo_ctx: CanvasRenderingContext2D | null = null;
let general_canvas: HTMLCanvasElement | null = null;
let pong_stats_canvas: HTMLCanvasElement | null = null;
let ping_stats_canvas: HTMLCanvasElement | null = null;
let ping_solo_canvas: HTMLCanvasElement | null = null;
let friendContainer: HTMLElement | null = null;

let actual_canva: any;

const BUBBLE_image = new Image();
BUBBLE_image.src = "Frontend/assets/BUBBLE.png";

function create_friend_canvas(winrate_per_friend: any, json: any) {
	const containerDiv = document.getElementById("container");
	const friends_menu = document.getElementById("friends-menu");

	if (!containerDiv) return;

	// Créer un canvas pour chaque ami
	for (let i: number = 0; i < winrate_per_friend.length; i++) {
		const friend = winrate_per_friend[i];
		document.getElementById(`friend_${friend.username}`)?.remove();
		document.getElementById(`friend_${friend.username}_canvas`)?.remove();
		const canvas = document.createElement("canvas");
		friendContainer = canvas;
		canvas.id = `friend_${friend.username}_canvas`;
		canvas.width = 600;
		canvas.height = 700;
		canvas.className = "hidden w-[320px] h-[373px] sm:w-[600px] sm:h-[700px]";
		
		containerDiv.appendChild(canvas);
		const ctx_canva:CanvasRenderingContext2D | null = canvas.getContext("2d");
		if (window.innerWidth < 700) {
			let scale: number = window.innerWidth / 700; 
			ctx_canva?.setTransform(1, 0, 0, 1, 0, 0);
			ctx_canva?.clearRect(0, 0, canvas.width, canvas.height);
			ctx_canva?.translate(canvas.width / 2, canvas.height / 2);
			ctx_canva?.scale(scale, scale);
			ctx_canva?.translate(-canvas.width / 2, -canvas.height / 2);
		}
		if (ctx_canva) {
			let size: number = friend.username.length;
			let image_height: number = 50;
			let image_width: number = 175 + 30 * size;
			ctx_canva.drawImage(BUBBLE_image, canvas.width / 2 - image_width / 2, 70 - image_height / 2, image_width, image_height);
			shadow_text(`Stats against ${friend.username}`, canvas.width / 2, 75, 20, "center", ctx_canva, "black");
			image_height = 275;
			image_width = 300;
			ctx_canva.drawImage(BUBBLE_image, canvas.width - canvas.width / 3 + 50 - image_width / 2, canvas.height -  2 * image_height - 40, image_width, image_height);
			ctx_canva.drawImage(BUBBLE_image, 0, canvas.height - image_height - 20 - image_height / 2, image_width, image_height);
			ctx_canva.drawImage(BUBBLE_image, canvas.width - canvas.width / 3 + 50 - image_width / 2, canvas.height - image_height, image_width, image_height);
			draw_cheese(canvas.width - canvas.width / 3 + 50, canvas.height -  3 * image_height / 2 - 40, "WINRATE", json.winrate_against_friends[i].winrate || 0, canvas.width / 8, ctx_canva, "green", "#374151", 25); 
			draw_cheese(canvas.width / 3 - 50, canvas.height - image_height - 20, "WINRATE PONG", json.winrate_against_friends_pong[i].winrate || 0, canvas.width / 8, ctx_canva, "purple", "#374151", 25);
			draw_cheese(canvas.width - canvas.width / 3 + 50, canvas.height - image_height / 2, "WINRATE PING", json.winrate_against_friends_ping[i].winrate || 0, canvas.width / 8, ctx_canva, "cyan", "#374151", 25);
			canvas_map.push({name: `${friend.username}`, canvas: canvas});
			const div = document.createElement("div");
			div.id = `friend_${friend.username}`;
			div.className = "block px-4 py-2 text-white font-canted hover:bg-gray-100 dark:hover:bg-gray-700";
			div.setAttribute("onclick", `display_canvas(\"${friend.username}\")`);
			div.innerHTML = `<span>${friend.username}</span>`
			friends_menu?.appendChild(div);
		}
	}
}

async function get_stats(username: string | null, canva_name: string): Promise<void> {
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
        if (!general_ctx || !general_canvas) {
			return ;
        }
		let image_height: number = general_canvas.height * 0.3;
		let image_width: number = general_canvas.width * 0.8;
		general_ctx.drawImage(BUBBLE_image, general_canvas.width / 2 - image_width / 2, general_canvas.height / 2 + general_canvas.height / 6, image_width, image_height);

		image_height = general_canvas.height * 0.6;
		image_width = general_canvas.width * 0.6;
		general_ctx.drawImage(BUBBLE_image, general_canvas.width / 2 - image_width / 2, 0, image_width, image_height);

		draw_cheese(general_canvas.width / 2, general_canvas.height / 3.33, "WINRATE", jsonResponse.winrate, general_canvas.width / 6, general_ctx, "#3f6700", "#374151", 30);
		shadow_text("Tournaments won: " + jsonResponse.nbr_of_tournament_won, general_canvas.width / 8, general_canvas.height / 2 + general_canvas.height * 0.32 - general_canvas.height * 0.1, 20, "start", general_ctx, "black");
		shadow_text("Average place in tournaments: " + jsonResponse.average_place_in_tournament.toFixed(2), general_canvas.width / 8, general_canvas.height / 2 + general_canvas.height * 0.32, 20, "start", general_ctx, "black");
		shadow_text("Average score in tournaments: " + jsonResponse.average_score_in_tournament.toFixed(2), general_canvas.width / 8, general_canvas.height / 2 + general_canvas.height * 0.32 + general_canvas.height * 0.1, 20, "start", general_ctx, "black");
	}
	pong_stats_canvas = document.getElementById("pong_stats") as HTMLCanvasElement;
	if (pong_stats_canvas) {
		pong_stats_ctx = pong_stats_canvas.getContext("2d");
		if (!pong_stats_ctx || !pong_stats_canvas)
			return;
		let image_height: number = pong_stats_canvas.height * 0.3;
		let image_width: number = pong_stats_canvas.width * 0.95;
		pong_stats_ctx.drawImage(BUBBLE_image, pong_stats_canvas.width / 2 - image_width / 2, pong_stats_canvas.height / 2 + pong_stats_canvas.height / 6, image_width, image_height);

		image_height = pong_stats_canvas.height * 0.6;
		image_width = pong_stats_canvas.width * 0.6;
		pong_stats_ctx.drawImage(BUBBLE_image, pong_stats_canvas.width / 2 - image_width / 2, 0, image_width, image_height);

		draw_cheese(pong_stats_canvas.width / 2, pong_stats_canvas.height / 3.33, "WINRATE", jsonResponse.winrate_pong, pong_stats_canvas.width / 6, pong_stats_ctx, "#3f6700", "#374151", 30);
		shadow_text("PONG tournaments won: " + jsonResponse.nbr_of_tournament_won_pong, pong_stats_canvas.width / 16, pong_stats_canvas.height / 2 + pong_stats_canvas.height * 0.32 - pong_stats_canvas.height * 0.1, 20, "start", pong_stats_ctx, "black");
		shadow_text("Average place in PONG tournaments: " + jsonResponse.average_place_in_tournament_pong.toFixed(2), pong_stats_canvas.width / 16, pong_stats_canvas.height / 2 + pong_stats_canvas.height * 0.32, 20, "start", pong_stats_ctx, "black");
		shadow_text("Average score in PONG tournaments: " + jsonResponse.average_score_in_tournament_pong.toFixed(2), pong_stats_canvas.width / 16, pong_stats_canvas.height / 2 + pong_stats_canvas.height * 0.32 + pong_stats_canvas.height * 0.1, 20, "start", pong_stats_ctx, "black");
	}

	ping_stats_canvas = document.getElementById("ping_stats") as HTMLCanvasElement;
	if (ping_stats_canvas) {
		ping_stats_ctx = ping_stats_canvas.getContext("2d");
		if (!ping_stats_ctx)
			return;
		let image_height: number = ping_stats_canvas.height * 0.2;
		let image_width: number = ping_stats_canvas.width * 0.95;
		ping_stats_ctx.drawImage(BUBBLE_image, ping_stats_canvas.width / 2 - image_width / 2, ping_stats_canvas.height / 2, image_width, image_height);

		image_height = ping_stats_canvas.height * 0.45;
		image_width = ping_stats_canvas.width * 0.6;
		ping_stats_ctx.drawImage(BUBBLE_image, ping_stats_canvas.width / 2 - image_width / 2, 0, image_width, image_height);

		image_height = ping_stats_canvas.height * 0.28;
		image_width = ping_stats_canvas.width;
		ping_stats_ctx.drawImage(BUBBLE_image, 0, ping_stats_canvas.height - image_height, image_width, image_height);

		draw_cheese(ping_stats_canvas.width / 2, ping_stats_canvas.height / 4.44, "WINRATE", jsonResponse.winrate_ping, ping_stats_canvas.width / 6, ping_stats_ctx, "#3f6700", "#374151", 30);
		shadow_text("PING tournaments won: " + jsonResponse.nbr_of_tournament_won_ping, ping_stats_canvas.width / 16, 43 * ping_stats_canvas.height / 80, 20, "start", ping_stats_ctx, "black");
		shadow_text("Average place in PING tournaments: " + jsonResponse.average_place_in_tournament_ping.toFixed(2), ping_stats_canvas.width / 16, 46.66 * ping_stats_canvas.height / 80, 20, "start", ping_stats_ctx, "black");
		shadow_text("Average score in PING tournaments: " + jsonResponse.average_score_in_tournament_ping.toFixed(2), ping_stats_canvas.width / 16, 50.33 * ping_stats_canvas.height / 80, 20, "start", ping_stats_ctx, "black");
		shadow_text("Average bounce in PING games: " + jsonResponse.average_bounce_per_game.toFixed(2), ping_stats_canvas.width / 16, 54 * ping_stats_canvas.height / 80, 20, "start", ping_stats_ctx, "black");
		shadow_text("Goalrate with : ", ping_stats_canvas.width / 2, ping_stats_canvas.height  - image_height / 1.1, 20, "center", ping_stats_ctx, "black");
		draw_cheese(ping_stats_canvas.width / 6, ping_stats_canvas.height - image_height / 2.2, "bonus paddle", jsonResponse.goal_after_bonus_paddle, ping_stats_canvas.width / 12, ping_stats_ctx, "#00E100", "black", 15);
		draw_cheese(ping_stats_canvas.width / 6 * 3, ping_stats_canvas.height - image_height / 2.2, "bonus goal", jsonResponse.goal_after_bonus_goal, ping_stats_canvas.width / 12, ping_stats_ctx, "#FC00C6", "black", 15);
		draw_cheese(ping_stats_canvas.width / 6 * 5, ping_stats_canvas.height - image_height / 2.2, "bonus shield", jsonResponse.goal_after_bonus_shield, ping_stats_canvas.width / 12, ping_stats_ctx, "#00CDFF", "black", 15);
	}

	ping_solo_canvas = document.getElementById("ping_solo") as HTMLCanvasElement;
	if (ping_solo_canvas) {
		ping_solo_ctx = ping_solo_canvas.getContext("2d");
		if (!ping_solo_ctx)
			return;
		let image_height: number = ping_stats_canvas.height * 0.5;
		let image_width: number = ping_stats_canvas.width * 0.9;
		ping_solo_ctx.drawImage(BUBBLE_image, ping_solo_canvas.width / 20, 0, image_width, image_height);
		shadow_text("LEADERBOARD", ping_solo_canvas.width / 2, ping_solo_canvas.height / 10, 40, "center", ping_solo_ctx, "black");

		image_height = ping_stats_canvas.height * 0.2;
		image_width = ping_stats_canvas.width * 0.9;
		ping_solo_ctx.drawImage(BUBBLE_image, ping_stats_canvas.width / 20, ping_solo_canvas.height / 3 * 2, image_width, image_height);
		shadow_text("PERSONAL HIGH SCORE", ping_solo_canvas.width / 2, ping_solo_canvas.height / 3 * 2 + ping_solo_canvas.height / 20, 25, "center", ping_solo_ctx, "black");
		shadow_text(`${jsonResponse.my_high_score.high_score}`, ping_solo_canvas.width / 2, ping_solo_canvas.height / 3 * 2 + ping_solo_canvas.height / 5, 60, "center", ping_solo_ctx, "#3f6700");

		for (let i = 0; i < jsonResponse.topPlayers.length; i++) {
			const red = Math.round((i / 4) * 128);  // 128 → 0
			const blue = Math.round(128 - (i / 4) * 128);       // 0 → 128
			const color = `#${red.toString(16).padStart(2, '0')}00${blue.toString(16).padStart(2, '0')}`;
			shadow_text(`${i + 1}. ${jsonResponse.topPlayers[i]?.username}`, ping_solo_canvas.width / 10, ping_solo_canvas.height / 5 + ping_solo_canvas.height / 10 * i, 30 - i * 2, "start", ping_solo_ctx, color);
			shadow_text(`${jsonResponse.topPlayers[i]?.high_score}`, ping_solo_canvas.width - ping_solo_canvas.width / 8, ping_solo_canvas.height / 5 + ping_solo_canvas.height / 10 * i, 30 - i * 2, "end", ping_solo_ctx, color);
		}
	}
	display_canvas(canva_name);
}

function display_dashboard_menu() {
	// const btn = document.getElementById("dropdownButton");
	const menu = document.getElementById("dropdownMenu");

	menu?.classList.toggle("hidden");
}


function display_canvas(canva_name: string) {
	let canva_to_display : HTMLCanvasElement | null = null;
	actual_canva = canva_name;
	for (let i: number = 0; i < canvas_map.length; i++) {
		if (canvas_map[i].name == canva_name) {
			canva_to_display = canvas_map[i].canvas;
		}
		else {
			canvas_map[i].canvas?.classList.add("hidden");
		}
	}
	canva_to_display?.classList.remove("hidden");
	if (canva_name == "general") {
		if (general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.remove("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
		if (!ping_solo_canvas?.classList.contains("hidden"))
			ping_solo_canvas?.classList.add("hidden");
	} else if(canva_name == "ping") {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.remove("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
		if (!ping_solo_canvas?.classList.contains("hidden"))
			ping_solo_canvas?.classList.add("hidden");
	} else if (canva_name == "pong") {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.remove("hidden");
		if (!ping_solo_canvas?.classList.contains("hidden"))
			ping_solo_canvas?.classList.add("hidden");
	} else if (canva_name == "solo") {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
		if (ping_solo_canvas?.classList.contains("hidden"))
			ping_solo_canvas?.classList.remove("hidden");
	} else {
		if (!general_canvas?.classList.contains("hidden"))
			general_canvas?.classList.add("hidden");
		if (!ping_stats_canvas?.classList.contains("hidden"))
			ping_stats_canvas?.classList.add("hidden");
		if (!pong_stats_canvas?.classList.contains("hidden"))
			pong_stats_canvas?.classList.add("hidden");
		if (!ping_solo_canvas?.classList.contains("hidden"))
			ping_solo_canvas?.classList.add("hidden");
	}
}


function shadow_text(string: string, x: number, y: number, font_size: number, align: CanvasTextAlign, ctx: CanvasRenderingContext2D, color: string) {
	if (!ctx)
		return;
	ctx.font = `bold ${font_size}px 'Canted Comic', 'system-ui', sans-serif`;
	ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
	ctx.textAlign = align;
	ctx.fillText(string, x, y + 5);
	
	ctx.font = `bold ${font_size}px 'Canted Comic', 'system-ui', sans-serif`;
	ctx.fillStyle = color;
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

	shadow_text(title, x, y - size - size / 3, fontsize, "center", ctx, "black");
	shadow_text(percent.toFixed(2) + "%", x, y + fontsize / 2, fontsize, "center", ctx, "black");
}

function display_friend_menu() {
	const friend_menu = document.getElementById("friends-menu");
	friend_menu?.classList.toggle("hidden");
}

document.addEventListener("click", function(event: MouseEvent) {
	const Menufriends = document.getElementById("friends-menu");
	const MenufriendsButton = document.getElementById("friend-menu-button");
	if (!Menufriends || !MenufriendsButton)
		return;
	
	if (!Menufriends?.contains(event.target as Node) && !MenufriendsButton?.contains(event.target as Node)) {
		Menufriends?.classList.add("hidden");
	}
});