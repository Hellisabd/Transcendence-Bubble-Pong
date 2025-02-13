console.log("Script spa.ts chargé !");

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


async function navigateTo(page: string, addHistory: boolean = true): Promise<void> {
    console.log("Navigating to:", page);

    const contentDiv = document.getElementById("content") as HTMLDivElement;
    const userDiv = document.getElementById("user") as HTMLDivElement;

    // Vider le contenu actuel
    contentDiv.innerHTML = '';
    userDiv.innerHTML = '';

    let url: string = page == "index" ? "/" : `/${page}`;

    try {
        const response: Response = await fetch(url, {
            credentials: "include",
            headers: { "Content-Type": "text/html" }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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
        const username: string | null = await get_user(); 
        console.log(`✅ Utilisateur récupéré : ${username}`);

        if (username) {
            userDiv.innerHTML = `👤 ${username}`;
            userDiv.style.display = "block";
        } else {
            userDiv.innerHTML = "";
            userDiv.style.display = "none";
        }

        if (addHistory) {
            window.history.pushState({ page: page }, "", `/${page}`);
        }

    } catch (error) {
        console.error('❌ Erreur de chargement de la page:', error);
    }
}

async function get_user(): Promise<string | null> {
    try {
        const response = await fetch("/get_user", {
            method: "GET",
            credentials: "include",
        })
        if (!response.ok)
            return null;
        const data: {success: boolean; username?: string} = await response.json();
        return data.success ? data.username ?? null : null; 
    } catch (error) {
        alert("Erreur cant get user");
        return null;
    }
}

// Gestion de l'historique
window.onpopstate = function(event: PopStateEvent): void {
    if (event.state) {
		console.log("Navigating back/forward to:", event.state.page);
        navigateTo(event.state.page, false);
	};
}

set_user();