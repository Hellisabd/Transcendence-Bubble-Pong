console.log("Script spa.js chargé !");

if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

async function set_user() {
    const userDiv = document.getElementById("user");
    
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


async function navigateTo(page, addHistory = true) {
    console.log("Navigating to:", page);

    const contentDiv = document.getElementById("content");
    const userDiv = document.getElementById("user");

    // Vider le contenu actuel
    contentDiv.innerHTML = '';
    userDiv.innerHTML = '';

    let url = page == "index" ? "/" : `/${page}`;

    try {
        response = await fetch(url, {
            credentials: "include",
            headers: { "Content-Type": "text/html" }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;

        // ✅ Mise à jour du contenu principal
        const newContent = tempDiv.querySelector("#content");
        if (newContent) {
            contentDiv.innerHTML = newContent.innerHTML;
        } else {
            console.error("Erreur : Aucun élément #content trouvé dans la page chargée.");
        }

        // ✅ Attendre la valeur correcte de `get_user()`
        const username = await get_user(); 
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

async function get_user() {
    try {
        const response = await fetch("/get_user", {
            method: "GET",
            credentials: "include",
        })
        if (!response.ok)
            return null;
        const data = await response.json();
        return data.success ? data.username : null; 
    } catch (error) {
        alert("Erreur cant get user");
    }
}

// Gestion de l'historique
window.onpopstate = function(event) {
    if (event.state) {
		console.log("Navigating back/forward to:", event.state.page);
        navigateTo(event.state.page, false);
	};
}

set_user();