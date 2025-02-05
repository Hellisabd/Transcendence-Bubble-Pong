
console.log("Script spa.js chargé !");

if (window.location.pathname === "/") {
    window.history.replaceState({ page: "index" }, "Index", "/index");
}

function navigateTo(page,  addHistory = true) {
    console.log("Navigating to:", page);

    const contentDiv = document.getElementById("content");
    const headerDiv = document.getElementById("header");

    // Vider le contenu actuel
    contentDiv.innerHTML = '';
    headerDiv.innerHTML = '';

	let url = page == "index" ? "/" : `/${page}`
    // Utiliser Fetch API pour récupérer le contenu du serveur
    fetch(url)  // Ajout du "/" pour éviter des erreurs
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;

            const newContent = tempDiv.querySelector("#content");
            const newHeader = tempDiv.querySelector("header");

            if (newContent) {
                contentDiv.innerHTML = newContent.innerHTML;
            }
            else {
                console.error("Erreur : Aucun élément #content trouvé dans la page chargée.")
            }
            if (newHeader) {
                headerDiv.innerHTML = newHeader.innerHTML;
            }
            else {
                console.error("Erreur : Aucun élément #header trouvé dans la page chargée.")
            }
			if (addHistory)
            	window.history.pushState({ page: page }, "", `/${page}`);
        })
        .catch(error => console.error('Erreur de chargement de la page:', error));
}

// Gestion de l'historique
window.onpopstate = function(event) {
    if (event.state) {
		console.log("Navigating back/forward to:", event.state.page);
        navigateTo(event.state.page, false);
	};
}