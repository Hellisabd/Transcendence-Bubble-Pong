console.log("Script spa.ts chargé !");

let old_url: null | string = null;

declare function display_friends(): void;
declare function set_up_friend_list(user: string | null);

declare function play_pong(): void;
declare function pong_tournament(): void;
declare function play_ping(): void;
declare function ping_tournament(): void;
declare function get_stats(username: string | null): void;

if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

async function set_user(contentDiv: HTMLDivElement, username: string | null): Promise<void> {
	if (!username)
		return;

	const userDiv = contentDiv.querySelector("#user") as HTMLDivElement;
	const avatarElement = contentDiv.querySelector("#avatar") as HTMLImageElement;
	userDiv.innerHTML = `${username}`;
	userDiv.classList.add("text-white");
	avatarElement.classList.add("w-12");
	avatarElement.classList.add("h-12");
	avatarElement.classList.add("hover:border-2");
	avatarElement.classList.add("hover:border-white");

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


async function navigateTo(page: string, addHistory: boolean = true, classement:  { username: string; score: number }[] | null): Promise<void> {
	console.log(`🚀 Changement de page: ${page}`);
	let afficheUser = false;
	const username = await get_user();
    const loging: boolean = page == "login";
    const creating: boolean = page == "create_account";
    const loged: boolean = creating || loging;
    if (username && username.length > 0) {
        afficheUser = true;
        if (page == "login" || page == "create_account"){
            page = "index";
        }
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
            console.log("url: ", url);
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
        } else {
            console.error("Erreur : Aucun élément #content trouvé dans la page chargée.");
        }
        document.title =  html.substring(html.indexOf("<title>") + 7, html.indexOf("</title>", html.indexOf("<title>")));
        console.log("document title: ", document.title);
		set_user(contentDiv, username);
        // console.log("caca8", window.history.state.page);
        if (addHistory/*  && window.history.state.page !== page */) {
            // old_url = page;
            window.history.pushState({ page: page }, "", `/${page}`);
        }
        Disconnect_from_game();
        ping_Disconnect_from_game();
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
        if (page === "social") {
            pending_request();
            console.log("passse dans pending request");
        }
        if (page === "pong_game") {
            initializeAnimationPong();
            initializeAnimationPing();
        }
        if (page === "dashboard") {
            get_stats(username);
            console.log("passse dans dashboard");
        }
        display_friends();
        pending_request();

    } catch (error) {
        console.error('❌ Erreur de chargement de la page:', error);
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
    if (window.location.pathname.substring(1) == "end_tournament") {
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