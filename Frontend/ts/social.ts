console.log("Script social.ts chargé !");


let socialSocket: WebSocket | null = null;

function display_friends() {

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