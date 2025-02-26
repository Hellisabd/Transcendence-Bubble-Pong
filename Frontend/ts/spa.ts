console.log("Script spa.ts chargé !");

declare function display_friends();
declare function play_pong();
declare function pong_tournament();
declare function play_game2();
declare function game2_tournament();


if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

async function set_user(): Promise<void> {
    const userDiv = document.getElementById("user") as HTMLDivElement;
    
    const username =  await get_user();
    console.log(`✅ Utilisateur récupéré : ${username}`);
    
    if (username) {
        userDiv.innerHTML = `👤 ${username}`;
        userDiv.style.display = "block";
    } else {
        userDiv.innerHTML = "";
        userDiv.style.display = "none";
    }
}


async function navigateTo(page: string, addHistory: boolean = true, classement:  { username: string; score: number }[] | null): Promise<void> {
    console.log("Navigating to:", page);
    let afficheUser = false;
    const username: string | null = await get_user();
    console.log(`✅ Utilisateur récupéré : ${username}`);
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
        console.log("passe dans recur");
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
            console.log("ask for end tournament");
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
            userDiv.innerHTML = `prout: ${username}`;
            userDiv.style.display = "block";
        }
        if (addHistory) {
            window.history.pushState({ page: page }, "", `/${page}`);
        }
        console.log("deco spa");
        Disconnect_from_game();
        if (page === "waiting_room")
            play_pong();
        if (page === "pong_tournament")
            pong_tournament();
        if (page === "game2_waiting_room")
            play_game2();
        if (page === "game2_tournament")
            game2_tournament();
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
		console.log("Navigating back/forward to:", event.state.page);
        navigateTo(event.state.page, false, null);
	};
}

set_user();