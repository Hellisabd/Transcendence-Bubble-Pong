console.log("Script social.ts chargé !");
declare function get_user(): Promise<string | null>;

let friends: { username: string; status: string }[] = [];



let socialSocket: WebSocket | null = null;

async function display_friends() {
	const canvas = document.getElementById("friends_list") as HTMLCanvasElement;
	if (canvas) {
		const ctx = canvas.getContext("2d");
        if (!ctx) {
            return ;
        }
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		console.log("passe dans display friends");
		for (let i = 0; i < friends.length; i++) {
			ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
            ctx.font = "20px Arial";
			if (friends[i].status == "online")
            	ctx.fillStyle = "#00FF00";
			else if (friends[i].status == "offline"){
				ctx.fillStyle = "#FF0000";
			}
			else if (friends[i].status == "inqueue"){
				ctx.fillStyle = "#0080FF";
			}
			else if (friends[i].status == "ingame"){
				ctx.fillStyle = "#FF8000";
			}
            ctx.fillText(String(friends[i].username), 0, 20 + (i * 30));
            ctx.fillText(String(friends[i].status), 200, 20 + (i * 30));
		}
	}
}

async function set_up_friend_list(user: string | null) {
	if (!user) {
		user = await get_user();
	}
    const sock_name = window.location.host;
	socialSocket = new WebSocket("wss://" + sock_name + "/ws/spa/friends");
    socialSocket.onopen = () => {
        console.log("✅ WebSocket users connectée !");
        socialSocket?.send(JSON.stringify({ username: user }));
    };
    socialSocket.onerror = (event) => {
    	console.error("❌ WebSocket users erreur :", user);};
	socialSocket.onclose = (event) => {
        console.warn("⚠️ WebSocket users fermée :", user);};
	socialSocket.onmessage = (event) => {
        let data = JSON.parse(event.data);
		console.log("data::: ", data);
		const index = friends.findIndex(friend => friend.username == data.username);
		if (index == -1)
			friends.push({username: data.username, status: data.status});
		else {
			friends[index] = {username: data.username, status: data.status};
		}
        display_friends();
    };
}

function close_users_socket() {
	socialSocket?.close();
	friends = [];
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
