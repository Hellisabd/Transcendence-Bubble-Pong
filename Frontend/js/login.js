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
        console.log(`result::: ${result.success}`);
        if (result.success) {
            alert(JSON.stringify(result));
            navigateTo("");
        } else {
            alert("Erreur : Wrong email or password");
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
    
    const response = await fetch("/create_account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email })
    });
    console.log(`username: ${username}`);
    console.log(`password: ${password}`);
    console.log(`email: ${email}`);
    if (!response.success) {
        alert("Erreur: utilisateur existant");
        navigateTo("create_account");
    } else {
        const result = await response.json();
    
        if (result.success) {
            alert("Compte creer!");
            navigateTo("login");
        } else {
            alert("Erreur : " + result.error);
        }
    }

}

async function logout(print) {
    await fetch("/logout", {
        method: "GET",
    });
    if (print) {
        alert("deconnexion!");
        navigateTo("");
    }
}

async function modify_user(event) {
    event.preventDefault();
    const newusername = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const email = document.getElementById("email").value;
    console.log(`newusername: ${newusername}`);
    console.log(`password: ${password}`);
    console.log(`email: ${email}`);
    const username = await get_user(); 
    console.log(`oldusername: ${newusername}`);
    if (!username) {
        alert("Cant get user!");
    } else {
        await fetch("/modify_user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newusername, password, email, username })
        });
        logout(0);
        alert("Modification Done!");
        navigateTo("login");
    }
}