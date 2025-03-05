console.log("Script spa.ts chargé !");

declare function display_friends();

if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

async function set_user(): Promise<void> {
    const userDiv = document.getElementById("user") as HTMLDivElement;

    const username =  await get_user();

    if (username) {
        userDiv.innerHTML = `👤 ${username}`;
		userDiv.classList.add("text-white");
		userDiv.classList.add("color-purple-800");

        userDiv.style.display = "block";
    } else {
        userDiv.innerHTML = "";
        userDiv.style.display = "none";
    }
}


async function navigateTo(page: string, addHistory: boolean = true, classement:  { username: string; score: number }[] | null): Promise<void> {
	console.log(`🚀 Changement de page: ${page}`);
	let afficheUser = false;
    const username: string | null = await get_user();
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
    const userDiv = document.getElementById("user") as HTMLDivElement;

    // Vider le contenu actuel
    contentDiv.innerHTML = '';
    userDiv.innerHTML = '';

    let url: string = page == "index" ? "/" : `/${page}`;

    try {
        let response: Response | null = null;
        if (url === "/end_tournament") {
            response = await fetch("/end_tournament", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classement: classement})
            });
        }
        else {
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
        tempDiv.innerHTML = html;

        // ✅ Mise à jour du contenu principal
        const newContent: HTMLDivElement | null = tempDiv.querySelector("#content");
        if (newContent) {
            contentDiv.innerHTML = newContent.innerHTML;
        } else {
            console.error("Erreur : Aucun élément #content trouvé dans la page chargée.");
        }
        // ✅ Attendre la valeur correcte de `get_user()`
        if (afficheUser) {
            const response = await fetch("/get_avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username})
            });
            const response_avatar = await response.json();
            const avatar_name = await response_avatar.avatar_name;
            userDiv.innerHTML = `prout: ${username}
            <img src="../Frontend/avatar/${avatar_name}" alt="Avatar" width="50" height="50">`;
            userDiv.style.display = "block";
        }
        if (addHistory) {
            window.history.pushState({ page: page }, "", `/${page}`);
        }
        Disconnect_from_game();
        if (page === "waiting_room")
            play_pong();
        if (page === "pong_tournament")
            pong_tournament();
        // if (url === "/social") {
        //     // pending_request();
        //     display_friends();
        // }
        display_friends();

    } catch (error) {
        console.error('❌ Erreur de chargement de la page:', error);
    }
}

async function get_user(): Promise<string> {
    try {
        const response = await fetch("/get_user", {
            method: "GET",
            credentials: "include",
        })
        if (!response.ok)
            return "";
        const data: {success: boolean; username?: string} = await response.json();
        return data.success ? data.username ?? "" : "";
    } catch (error) {
        alert("Erreur cant get user");
        return "";
    }
}

// Gestion de l'historique
window.onpopstate = function(event: PopStateEvent): void {
    if (event.state) {
        navigateTo(event.state.page, false, null);
	};
}

set_user();