let old_url: null | string = null;

declare function display_friends(): void;
declare function set_up_friend_list(user: string | null): void;
declare function play_pong(): void;
declare function pong_tournament(): void;
declare function play_ping(): void;
declare function ping_tournament(): void;
declare function get_stats(username: string | null, canva_name: string): void;
declare function initializeAnimationPong(): void;
declare function initializeAnimationPing(): void;
declare function soloping_initializeGame(): void;
declare function check_friend_list_state(): WebSocket | null;

if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

async function set_user(username: string | null): Promise<void> {
	if (!username)
		return;

	const userDiv = document.getElementById("user") as HTMLDivElement;
    if (!userDiv) {
        return ;
    }
	const avatarElement = document.getElementById("avatar") as HTMLImageElement;
	userDiv.innerHTML = `${username}`;
	userDiv?.classList.add("text-white");
	avatarElement.classList.add("w-12");
	avatarElement.classList.add("h-12");

	const response = await fetch("/get_avatar", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: username})
	});
	const response_avatar = await response.json();
	const avatar_name = await response_avatar.avatar_name;
	avatarElement.src = `./Frontend/avatar/${avatar_name}`;
	// avatar_name navbar
}

async function set_up_bars() {
    let navDiv = document.getElementById("navbar") as HTMLDivElement;
    let sideDiv = document.getElementById("sidebarAll") as HTMLDivElement;
    if (navDiv && sideDiv)
    {
        return ;
    }
    if (!sideDiv) {
        sideDiv = document.createElement("div");
        sideDiv.innerHTML = `<div id="sidebarAll">
        <button id="sidebarButton" onclick="toggleSidebar()" class="hover:ring-2 ring-white fixed z-[9998] text-white right-0 top-1/2 w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center ">
            <div id="pelletSocial" class="absolute hidden bg-green-500 rounded-full w-2 h-2 top-0 left-[1.5rem]"></div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        </button>


        <div id="sidebar" class="animate-leftFadeInBar overflow-y-scroll hidden h-[100vh] w-80 md:w-[20rem] bg-black text-white fixed top-0 right-0 text-xs md:text-lg z-[9990]">
            <div class="pl-5 pt-20">
                <form onsubmit="add_friend(event)" class="flex items-center space-x-2">
                    <input type="search" id="friend_username" required
                        class="pl-2 py-1 w-[10rem] text-black border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-green-300"
                        placeholder="Add friend" />
                    <button class="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition duration-200"
                        type="submit">
                        Add
                    </button>
                </form>
            </div>

            <div id="pending_request_div" class="p-4 mt-10">
                <h2 class="font-bold text-center text-2xl">Pending request</h2>
                <div class="border justify-self-center border-slate-500 w-56 mt-2"></div>
                <div id="pending_request"></div>
            </div>
            <div class="p-4 mt-32">
                <h2 class="font-bold text-center text-2xl">Friends list</h2>
                <div class="border justify-self-center border-slate-500 w-40 mt-2"></div>
                <div id="friends_list" class=""></div>
            </div>
        </div>
    </div>`
    document.body.prepend(sideDiv);
    }
    if (!navDiv) {
        navDiv = document.createElement("div");
        navDiv.innerHTML = `<nav id="navbar" class="fixed w-full bg-black z-[9999]">
            <div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div class="relative flex h-16 items-center justify-between">
                    <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
                        <button onclick="displayMenu()" id="mobile-menu-button" type="button"
                            class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white">
                            <span class="sr-only">Open main menu</span>
                            <svg id="menu-icon-open" class="block size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                            <svg id="menu-icon-close" class="hidden size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div id="mobile-menu" class="absolute left-0 top-16 hidden sm:hidden bg-black p-4 space-y-2">
                        <a onclick="navigateTo('pong_game')" class="block text-white p-2 rounded hover:bg-gray-700">Games</a>
                        <a onclick="navigateTo('dashboard')" class="block text-white p-2 rounded hover:bg-gray-700">Dashboard</a>
                        <a onclick="navigateTo('history')" class="block text-white p-2 rounded hover:bg-gray-700">History</a>
                    </div>
                    <!-- Logo et liens -->
                    <div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                        <div class="hidden sm:ml-6 sm:block">
                            <div class="flex space-x-4">
                            <div class="flex shrink-0 items-center">
                                <img class="h-14 w-14"
                                    src="/Frontend/assets/PING_LOGO.webp"
                                    alt="Website logo"
                                    onclick="navigateTo('index')">
                            </div>
                                <svg class="w-14 h-14 group hover:bg-orange-100 p-2 rounded-lg" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" onclick="navigateTo('pong_game')">
                                    <path d="M9.5 16V14.5H15.5V16M13.5 10.5V14.5M11.5 10.5V14.5M15.5 7.5C15.5 9.15685 14.1569 10.5 12.5 10.5C10.8431 10.5 9.5 9.15685 9.5 7.5C9.5 5.84315 10.8431 4.5 12.5 4.5C14.1569 4.5 15.5 5.84315 15.5 7.5ZM18.5 19.5H6.5C5.94772 19.5 5.5 19.0523 5.5 18.5V17.5C5.5 16.9477 5.94772 16.5 6.5 16.5H18.5C19.0523 16.5 19.5 16.9477 19.5 17.5V18.5C19.5 19.0523 19.0523 19.5 18.5 19.5Z"
                                    class="stroke-[1.5] stroke-orange-100 group-hover:stroke-black"/>
                                </svg>
                                <svg class="w-14 h-14 group hover:bg-orange-100 p-2 rounded-lg" xmlns="http://www.w3.org/2000/svg" onclick="navigateTo('dashboard')" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                                    class="stroke-[1.5] stroke-orange-100 group-hover:stroke-black"/>
                                </svg>
                                <svg class="w-14 h-14 group hover:bg-orange-100 p-2 rounded-lg stroke-orange-100 size-6" fill=#FFEDD5 version="1.1" id="Capa_1" onclick="navigateTo('history')" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 550.379 550.379" xml:space="preserve" class="size-6">
                                    <path d="M458.091,128.116v326.842c0,26.698-21.723,48.421-48.422,48.421h-220.92c-26.699,0-48.421-21.723-48.421-48.421V242.439 c6.907,1.149,13.953,1.894,21.184,1.894c5.128,0,10.161-0.381,15.132-0.969v211.594c0,6.673,5.429,12.104,12.105,12.104h220.92 c6.674,0,12.105-5.432,12.105-12.104V128.116c0-6.676-5.432-12.105-12.105-12.105H289.835c0-12.625-1.897-24.793-5.297-36.315 h125.131C436.368,79.695,458.091,101.417,458.091,128.116z M159.49,228.401c-62.973,0-114.202-51.229-114.202-114.199 C45.289,51.229,96.517,0,159.49,0c62.971,0,114.202,51.229,114.202,114.202C273.692,177.172,222.461,228.401,159.49,228.401z M159.49,204.19c49.618,0,89.989-40.364,89.989-89.988c0-49.627-40.365-89.991-89.989-89.991 c-49.626,0-89.991,40.364-89.991,89.991C69.499,163.826,109.87,204.19,159.49,204.19z M227.981,126.308 c6.682,0,12.105-5.423,12.105-12.105s-5.423-12.105-12.105-12.105h-56.386v-47.52c0-6.682-5.423-12.105-12.105-12.105 s-12.105,5.423-12.105,12.105v59.625c0,6.682,5.423,12.105,12.105,12.105H227.981z M367.697,224.456h-131.14 c-6.682,0-12.105,5.423-12.105,12.105c0,6.683,5.423,12.105,12.105,12.105h131.14c6.685,0,12.105-5.423,12.105-12.105 C379.803,229.879,374.382,224.456,367.697,224.456z M367.91,297.885h-131.14c-6.682,0-12.105,5.42-12.105,12.105 s5.423,12.105,12.105,12.105h131.14c6.685,0,12.104-5.42,12.104-12.105S374.601,297.885,367.91,297.885z M367.91,374.353h-131.14 c-6.682,0-12.105,5.426-12.105,12.105c0,6.685,5.423,12.104,12.105,12.104h131.14c6.685,0,12.104-5.42,12.104-12.104 C380.015,379.778,374.601,374.353,367.91,374.353z"
                                    class="stroke-[5] stroke-orange-100 group-hover:fill-black"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <h1 onclick="navigateTo('index')" class="absolute left-1/2 transform -translate-x-1/2 text-white text-3xl sm:text-5xl font-kablam">
                        BUBBLE PONG
                    </h1>

                    <div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                        <div class="hidden sm:ml-6 sm:block">
                            <div id="user" class="relative ml-3"></div>
                        </div>
                        <div class="relative ml-3">
                            <div>
                                <button onclick="displayUserMenu()" id="user-menu-button" type="button"
                                    class="relative flex rounded-full bg-black text-sm">
                                    <img id="avatar" class="size-8 rounded-full hover:outline-none hover:ring-2 hover:ring-white hover:ring-offset-2 hover:ring-offset-gray-800" alt="Profile picture">
                                </button>
                            </div>
                            <div id="user-menu"
                                class="hidden absolute right-0 top-14 bg-black p-4 space-y-2 z-[9998]">
                                <div onclick="navigateTo('settings')" class="flex items-center text-white p-2 rounded hover:bg-gray-700 space-x-2 cursor-pointer">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
										<path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
									</svg>
									<span class="inline-block whitespace-nowrap">Settings</span>
                                </div>
                                <div onclick="logout(1)" class="flex items-center text-white p-2 rounded hover:bg-red-700 space-x-2 cursor-pointer">
                                    <svg xSettings://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    <span class="inline-block whitespace-nowrap">Log out</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>`
        document.body.prepend(navDiv);
    }
    const username = await get_user();
    set_user(username);
    display_friends();
}

function disable_bars() {
    const navdiv = document.getElementById("navbar");
    const sidediv = document.getElementById("sidebarAll");
    document.getElementById("navbar")?.remove();
    document.getElementById("sidebarAll")?.remove();
}

async function navigateTo(page: string, addHistory: boolean = true, classement:  { username: string; score: number }[] | null): Promise<void> {
	let afficheUser = false;
	const username = await get_user();
    const loging: boolean = page == "login";
    const creating: boolean = page == "create_account";
    const loged: boolean = creating || loging;
    if (username && username.length > 0) {
        afficheUser = true;
        if (page == "login"){
            page = "index";
        }
    }
    const status = await fetch("/get_status", {
        method: "GET",
        credentials: "include",
    });
    const statusJson = await status.json();
    if ((page == "waiting_room" || page == "ping_waiting_room" || page == "pong_tournament" || page == "ping_tournament") && (statusJson.status == "ingame" || statusJson.status == "inqueue")) {
        navigateTo("index", true, null);
    }
    if (!loged && !afficheUser) {
        navigateTo("login", true, null);
        return ;
    }
    const contentDiv = document.getElementById("content") as HTMLDivElement;
    let userDiv = document.getElementById("user") as HTMLDivElement;

    if (!userDiv)
        userDiv = document.createElement("div");
    contentDiv.innerHTML = '';
    userDiv.innerHTML = '';


    let url: string = page == "index" ? "/" : `/${page}`;
    if (page == "index") {
        page = "pong_game";
        url = "pong_game";
    }
    try {
        let response: Response | null = null;
        if (url === "/end_tournament" && classement) {
            response = await fetch("/end_tournament", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classement: classement})
            });
        }
        else {
            if (url == "/end_tournament") {
                url = "/";
                page = "index";
            }
            response = await fetch(url, {
                credentials: "include",
                headers: { "Content-Type": "text/html" }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        const html: string = await response.text();

        const tempDiv: HTMLDivElement = document.createElement("div");
        let bodyClass: string = "";
        if (-1 != html.indexOf("body class=\""))
            bodyClass = html.substring(html.indexOf("body class=\"") + 12, html.indexOf(">", html.indexOf("body class=\"")) - 1);
        document.body.className = bodyClass;
        tempDiv.innerHTML = html;

        // ✅ Mise à jour du contenu principal
        const newContent: HTMLDivElement | null = tempDiv.querySelector("#content");
        if (newContent) {
            contentDiv.innerHTML = newContent.innerHTML;
        }
        document.title =  html.substring(html.indexOf("<title>") + 7, html.indexOf("</title>", html.indexOf("<title>")));
        if (addHistory) {
            window.history.pushState({ page: page }, "", `/${page}`);
        }
        Disconnect_from_game();
        ping_Disconnect_from_game();
        solo_Disconnect_from_game();
        if (page === "waiting_room") {
            initializeAnimationPong();
            play_pong();
        }
        if (page === "pong_tournament") {
            initializeAnimationPong();
            pong_tournament();
        }
        if (page === "ping_waiting_room") {
            initializeAnimationPing();
            play_ping();
        }
        if (page === "ping_tournament") {
            initializeAnimationPing();
            ping_tournament();
        }
        if (page === "pong_game") {
            initializeAnimationPong();
            initializeAnimationPing();
        }
        if (page === "solo_ping") {
            soloping_initializeGame();
        }
        display_friends();
        if (page === "dashboard") {
            get_stats(username, "general");
        }
        if (page != "login") {
            await set_up_bars();
            if (!check_friend_list_state())
                set_up_friend_list(username);
            else {
                display_friends();
            }
            set_user(username);
            return ;
        }
        else {
            disable_bars();
        }

    } catch (error) {
        console.log('Error while loading the page.');
    }
}

async function get_user(): Promise<string | null> {
    const response = await fetch("/get_user", {
		method: "GET",
		credentials: "include",
	})
	if (!response.ok)
		return null;
	const data: {success: boolean; username?: string} = await response.json();
	return data.success ? data.username ?? null : null;
}

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname.substring(1) == "end_tournament" || window.location.pathname.substring(1) == "pong_tournament" || window.location.pathname.substring(1) == "ping_tournament" || window.location.pathname.substring(1) == "waiting_room" || window.location.pathname.substring(1) == "ping_waiting_room") {
        window.location.pathname = "/index";
    }
    navigateTo(window.location.pathname.substring(1), false, null);
});

// Gestion de l'historique
window.onpopstate = function(event: PopStateEvent): void {
    if (event.state) {
        navigateTo(event.state.page, false, null);
	};
}