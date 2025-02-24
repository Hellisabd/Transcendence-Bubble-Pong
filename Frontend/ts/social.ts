console.log("Script social.ts chargé !");
declare function get_user(): Promise<string | null>;
let friends = {};


let socialSocket: WebSocket | null = null;

async function display_friends() {
	const canvas = document.getElementById("friends_list") as HTMLCanvasElement;
	if (canvas) {
		const username = await get_user();
		console.log("Username: ", username);
		const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
		console.log("passe dans display friends");
		const response = await fetch("/get_friends", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: username })
		});
		const result = await response.json();
		console.log("result::::::", result);
		console.log(result);
		for (let i = 0; i < result.friends.length; i++) {
			ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = "20px Arial";
			if (result.friends[i].status == "online")
            	ctx.fillStyle = "#00FF00";
			else if (result.friends[i].status == "ingame"){
				ctx.fillStyle = "#FF0000";
			}
            ctx.fillText(String(result.friends[i].username), 0, 20 + (i * 30));
            ctx.fillText(String(result.friends[i].status), 50, 20 + (i * 30));
		}
	}
}

function set_up_friend_list(user: string) {
    // const sock_name = window.location.host;
	// socialSocket = new WebSocket("wss://" + sock_name + "/ws/matchmaking/pong");
    // socialSocket.onopen = () => {
    //     console.log("✅ WebSocket users connectée !");
    //     socialSocket?.send(JSON.stringify({ username: user }));
    // };
    // socialSocket.onerror = (event) => {
    // 	console.error("❌ WebSocket waiting erreur :", user);};
	// socialSocket.onclose = (event) => {
    //     console.warn("⚠️ WebSocket waiting fermée :", user);};
	// socialSocket.onmessage = (event) => {
    //     let data = JSON.parse(event.data);
    //     if (data.success == true) {
    //         display_friends();
    //     }
    // };
}

async function add_friend(event: Event): Promise<void> {
    event.preventDefault();

	console.log("passe dans addfriend");
	const friend_username = (document.getElementById("friend_username") as HTMLInputElement).value;
	const myusername = await get_user();
	if (myusername == friend_username) {
		alert("Prends un Curly");
		return ;
	}
	const response = await fetch("/add_friend", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_sending: myusername, user_to_add: friend_username })
	});
	const result: LoginResponse = await response.json();
	alert(result.message);
	return ;
}

async function pending_request(): Promise<void> {
	const myusername = await get_user();
	const response = await fetch("/pending_request", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: myusername})
	});
}
