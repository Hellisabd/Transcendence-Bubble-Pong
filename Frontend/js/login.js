console.log("login.js chargé")

async function login(event) {
    event.preventDefault();
    console.log("login appeler");
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        console.log(`email: ${email}`);
        console.log(`password: ${password}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            alert(JSON.stringify(result));
            navigateTo("");
        } else {
            alert("Erreur : " + result.error);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
        alert("Erreur de connexion au serveur.");
    }
}

async function create_account(event) {
    event.preventDefault();
    console.log("create account appeler");
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const email = document.getElementById("email").value;
    
    try {
        const response = await fetch("/create_account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, email })
        });
        console.log(`username: ${username}`);
        console.log(`password: ${password}`);
        console.log(`email: ${email}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            alert("Compte creer!");
            navigateTo("");
        } else {
            alert("Erreur : " + result.error);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
        alert("Erreur de connexion au serveur.");
    }
}

async function logout() {
    await fetch("/logout", {
        method: "GET",
    });
    alert("deconnexion!");
    navigateTo("");
}