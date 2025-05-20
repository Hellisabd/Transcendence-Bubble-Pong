declare function get_user(): Promise<string | null>;

let friends: { username: string; status: string }[] = [];

let old_friends_size: number = 0



let socialSocket: WebSocket | null = null;

function check_friend_list_state(): WebSocket | null {
	return socialSocket;
}

let displaying_friends: boolean = false;

async function display_friends() {
	if (displaying_friends || (old_friends_size == friends.length)) {
		pending_request();
		return ;
	}
	displaying_friends = true;
	old_friends_size = friends.length;
    const friendsDiv = <HTMLDivElement>document.getElementById("friends_list");
    if (friendsDiv) {
		friendsDiv.innerHTML = "";
        for (let i = 0; i < friends.length; i++) {
			const avatarDiv = document.createElement("div");
			avatarDiv.classList.add("relative");
			const avatar = document.createElement("img");

			const response = await fetch("/get_avatar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: friends[i].username})
			});
			const response_avatar = await response.json();
			const avatar_name = await response_avatar.avatar_name;
			avatar.src = `./Frontend/avatar/${avatar_name}`;

			const friendDiv = document.createElement("div");
			friendDiv.classList.add("flex", "items-center", "p-2", "border-b-2", "border-gray-200");
			const name = document.createElement("p");
			name.innerHTML = friends[i].username;

			name.classList.add("ml-4", "text-xl", "font-semibold");
			avatar.classList.add("w-10", "h-10", "rounded-full");

			const badge = document.createElement("div");
			if (friends[i].status == "online") {
				badge.classList.add("bg-green-500", "rounded-full", "w-4", "h-4", "absolute", "bottom-0", "-right-0");
			} else if (friends[i].status == "offline") {
				badge.innerHTML = `
					<svg class="absolute rounded-full w-6 h-6 bottom-0 -right-1" fill="#b91c1c" height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g>
						<path d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256S397.385,0,256,0z M384,283.429H128v-54.857 h256V283.429z"></path> </g> </g> </g>
					</svg>
				`;
			} else if (friends[i].status == "inqueue") {
				badge.innerHTML = `
					<svg class="absolute rounded-full w-6 h-6 bottom-0 -right-1" fill="#0369a1" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>hourglass</title>
						<path d="M18.404 16.53v-1.057c3.511-1.669 6.086-7.082 6.086-13.52h-16.727c0 6.4 2.534 11.817 6.013 13.52v1.057c-3.479 1.703-6.013 7.12-6.013 13.52h16.727c0-6.437-2.575-11.851-6.086-13.52zM10.614 8.165c3.309 1.482 7.484 1.48 11.078-0.255-0.894 3.323-2.769 5.706-4.979 6.073 0.094 0.127 0.15 0.283 0.15 0.453 0 0.422-0.342 0.764-0.764 0.764s-0.764-0.342-0.764-0.764c0-0.172 0.058-0.331 0.154-0.458-2.141-0.374-3.96-2.636-4.874-5.812zM16.099 20.117c-0.422 0-0.764-0.342-0.764-0.764s0.342-0.764 0.764-0.764 0.764 0.342 0.764 0.764-0.342 0.764-0.764 0.764zM16.863 21.819c0 0.422-0.342 0.764-0.764 0.764s-0.764-0.342-0.764-0.764 0.342-0.764 0.764-0.764c0.422 0 0.764 0.342 0.764 0.764zM16.099 17.666c-0.422 0-0.764-0.342-0.764-0.764s0.342-0.764 0.764-0.764 0.764 0.342 0.764 0.764c0 0.422-0.342 0.764-0.764 0.764zM11.377 28.266c3.697-6.226 5.737-6.365 9.546 0h-9.546z"></path> </g>
					</svg>
				`;
			} else if (friends[i].status == "ingame") {
				badge.innerHTML = `
					<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#5b21b6" class="absolute rounded-full w-6 h-6 bottom-0 -right-1 bi bi-joystick"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier">
						<path d="M10 2a2 2 0 0 1-1.5 1.937v5.087c.863.083 1.5.377 1.5.726 0 .414-.895.75-2 .75s-2-.336-2-.75c0-.35.637-.643 1.5-.726V3.937A2 2 0 1 1 10 2z"></path> <path d="M0 9.665v1.717a1 1 0 0 0 .553.894l6.553 3.277a2 2 0 0 0 1.788 0l6.553-3.277a1 1 0 0 0 .553-.894V9.665c0-.1-.06-.19-.152-.23L9.5 6.715v.993l5.227 2.178a.125.125 0 0 1 .001.23l-5.94 2.546a2 2 0 0 1-1.576 0l-5.94-2.546a.125.125 0 0 1 .001-.23L6.5 7.708l-.013-.988L.152 9.435a.25.25 0 0 0-.152.23z"></path> </g>
					</svg>
				`;
			}

			avatarDiv.appendChild(badge);
			avatarDiv.appendChild(avatar);
			friendDiv.appendChild(avatarDiv);
			friendDiv.appendChild(name);
			friendsDiv.appendChild(friendDiv);
        }
    }
	displaying_friends = false; 
}

let displaying_pending: boolean = false;

async function display_pending(user: string[]) {
	if (!user || displaying_pending)
		return ;
	if (user.length > 0 )
		displaying_pending = true;
	const pendingDiv = <HTMLDivElement>document.getElementById("pending_request");
	const pellet = <HTMLDivElement>document.getElementById("pelletSocial");
	const pendingParent = <HTMLDivElement>document.getElementById("pending_request_div");
	if (!pellet)
		return ;
	pellet.innerHTML = "";
	if (user.length > 0 && pellet) {
		pellet.classList.remove("hidden");
		pendingDiv.innerHTML = "";
		pendingParent.classList.remove("hidden");
	} else {
		pendingParent.classList.add("hidden");
		pellet.classList.add("hidden");
	}
	if (pendingDiv && user.length > 0) {
		for (const username of user) {
			if (document.getElementById(`${username}_pending`)) {
				continue ;
			}
			const userDiv = document.createElement("div");
			userDiv.id = `${username}_pending`;
			userDiv.classList.add("flex", "items-center", "p-2", "border-b-2", "border-gray-200");
			const avatar = document.createElement("img");
			avatar.classList.add("w-8", "h-8", "rounded-full");

			const response = await fetch("/get_avatar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username: username})
			});
			const response_avatar = await response.json();
			const avatar_name = await response_avatar.avatar_name;
			avatar.src = `./Frontend/avatar/${avatar_name}`;


			const parag = document.createElement("p");
			parag.textContent = username;
			parag.classList.add("ml-4", "mr-4", "text-xl", "font-semibold");
			const addFriend = document.createElement("button");
			addFriend.classList.add(
				"flex", "items-center", "justify-center",
				"bg-green-500", "text-white", "rounded-full",
				"w-6", "h-6",
				"hover:bg-green-600", "transition", "duration-200"
			);
			addFriend.onclick = () => valid_friend(username);

			const declineFriend = document.createElement("button");
			declineFriend.classList.add(
				"flex", "items-center", "justify-center",
				"bg-red-500", "text-white", "rounded-full",
				"w-6", "h-6", "ml-2",
				"hover:bg-red-600", "transition", "duration-200"
			);
			declineFriend.onclick = () => decline_friend(username);

			const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svgIcon.setAttribute("version", "1.1");
			svgIcon.setAttribute("width", "24");
			svgIcon.setAttribute("height", "24");
			svgIcon.setAttribute("viewBox", "0 0 500 500");
			svgIcon.classList.add("w-4", "h-4");
			svgIcon.setAttribute("fill", "#ffffff");
			const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("class", "st0");
			path.setAttribute("d", "M455.3,61.5C395.6,69.1,300.9,153.7,222,276c-6.1,9.4-11.9,18.8-17.4,28.1c0,0,0,0-0.1-0.1c-0.1,0.1-0.1,0.2-0.2,0.3c-12.8-12.8-26.6-25.6-41.2-38.1c-6.8-5.8-13.6-11.4-20.3-16.9L40.2,314.2c46.9,22,87.8,48.2,119.6,75.3c0-0.1,0.1-0.2,0.1-0.3c19.1,16.3,35,33,46.8,49.3c5.2-7.7,10.5-15.4,16-23.2c12-17.1,24.2-33.5,36.4-49.1c0,0,0.1,0.1,0.1,0.1c81.4-104.5,162.3-173.5,200.6-170.6L455.3,61.5z");
			g.appendChild(path);
			svgIcon.appendChild(g);

			const svgIconDecline = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svgIconDecline.setAttribute("version", "1.1");
			svgIconDecline.setAttribute("width", "24");
			svgIconDecline.setAttribute("height", "24");
			svgIconDecline.setAttribute("viewBox", "0 0 24 24");
			svgIconDecline.classList.add("w-4", "h-4");
			svgIconDecline.setAttribute("fill", "none");
			const gDecline = document.createElementNS("http://www.w3.org/2000/svg", "g");
			const pathDecline = document.createElementNS("http://www.w3.org/2000/svg", "path");
			pathDecline.setAttribute("d", "M16 8L8 16M8.00001 8L16 16");
			pathDecline.setAttribute("stroke", "#000000");
			pathDecline.setAttribute("stroke-width", "1.5");
			pathDecline.setAttribute("stroke-linecap", "round");
			pathDecline.setAttribute("stroke-linejoin", "round");
			gDecline.appendChild(pathDecline);
			svgIconDecline.appendChild(gDecline);

			declineFriend.appendChild(svgIconDecline);
			addFriend.appendChild(svgIcon);
			addFriend.appendChild(svgIcon);
			userDiv.appendChild(avatar);
			userDiv.appendChild(parag);
			userDiv.appendChild(addFriend);
			userDiv.appendChild(declineFriend);
			pendingDiv.appendChild(userDiv);
		}
	}
	displaying_pending = false;
}

let i = 0;

async function set_up_friend_list(user: string | null) {
	user = await get_user();
	if (!user)
		return ;
    const sock_name = window.location.host;
	if (socialSocket)
		return ;
	socialSocket = new WebSocket("wss://" + sock_name + "/ws/spa/friends");
    socialSocket.onopen = () => {
        socialSocket?.send(JSON.stringify({ username: user }));
    };
	socialSocket.onerror = (event) => {
	}
	socialSocket.onclose = (event) => {
        socialSocket = null;
	}
	socialSocket.onmessage = (event) => {
		let data = JSON.parse(event.data);
		const index = friends.findIndex(friend => friend.username == data.username);
		if (index == -1 &&  data.username && data.status) {
			friends.push({username: data.username, status: data.status});
		}
		else {
			friends[index] = {username: data.username, status: data.status};
		}
		display_friends();
    };
	display_friends();
}

function close_users_socket() {
	socialSocket?.close();
	friends = [];
}

async function valid_friend(friend_username: string): Promise<void> {
	if (!sanitizeInput(friend_username)) {
        return (Swal.fire({
			text: "We cannot let you do that!",
			icon: 'error'
		  }));
    }
	const myusername = await get_user();
	if (myusername == friend_username) {
		Swal.fire({
			title: '???',
			text: 'Prends un Curly',
			icon: 'question'
		  });
		return ;
	}
	const response = await fetch("/add_friend", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_sending: myusername, user_to_add: friend_username })
	});
	const result: LoginResponse = await response.json();
	Swal.fire({
		text: result.message,
		icon: 'success'
	  });
	return ;
}

async function decline_friend(friend_username: string): Promise<void> {
	const myusername = await get_user();
	if (myusername == friend_username) {
		Swal.fire({
			title: '???',
			text: 'Prends un Curly',
			icon: 'question'
		  });
		return;
	}

	try {
		const response = await fetch("/decline_friend", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ user_sending: myusername, user_to_decline: friend_username })
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			Swal.fire({
				text: result.message,
				icon: 'success'
			  });;
			return;
		}

		Swal.fire({
			text: result.message,
			icon: 'success'
		  });
	} catch (error) {
		Swal.fire({
			text: "An error occured.",
			icon: 'error'
		  });;
	}
}

async function add_friend(event: Event): Promise<void> {
    event.preventDefault();

	const friend_username = (document.getElementById("friend_username") as HTMLInputElement).value;
	if (!sanitizeInput(friend_username)) {
        return (Swal.fire({
			text: "Be carefull i can bite!",
			icon: 'error'
		  }));
    }
	const myusername = await get_user();
	if (myusername == friend_username) {
		Swal.fire({
			title: '???',
			text: 'Prends un Curly',
			icon: 'question'
		  });
		return ;
	}
	const response = await fetch("/add_friend", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_sending: myusername, user_to_add: friend_username })
	});
	const result: LoginResponse = await response.json();
	if (result.success) {
		Swal.fire({
			text: result.message,
			icon: 'success'
		  });
	} else {
		Swal.fire({
			text: result.message,
			icon: 'error'
		  });
	}
	return ;
}

async function pending_request(): Promise<void> {
	const myusername = await get_user();
	if (!myusername)
		return ;
	const response = await fetch("/pending_request", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: myusername})
	});
	const result = await response.json();
	display_pending(result.user_inviting);
}
