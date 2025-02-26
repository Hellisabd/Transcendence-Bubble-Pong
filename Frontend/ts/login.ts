console.log("login.ts chargé");

type LoginResponse = {
    success: boolean;
    message?: string;
};

type ModifyUserResponse = {
    success: boolean;
};

function sanitizeInput(input) {
    if (typeof input !== "string") return false;
    if (input.length > 50) return false; // Empêche les inputs trop longs
    if (!/^[a-zA-Z0-9._@-]+$/.test(input)) return false; // Autorise lettres, chiffres, ., @, _, et -
    return input;
}

declare function navigateTo(page: string, addHistory: boolean, classement:  { username: string; score: number }[] | null): void;
declare function get_user(): Promise<string | null>;

async function login(event: Event): Promise<void> {
    event.preventDefault();
    console.log("login appelé");
    
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    if (!sanitizeInput(email) || !sanitizeInput(password)) {
        return alert("Be carefull i can bite");
    }
    
    try {
        let domain =  window.location.host.substring(0, window.location.host.indexOf(':'));
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, "domain": domain })
        });

        console.log(`email: ${email}`);
        console.log(`password: ${password}`);
        console.log("domain:", domain);
        
        const result: LoginResponse = await response.json();
        console.log(`result::: ${result.success}`);

        if (result.success) {
            alert(JSON.stringify(result));
            navigateTo("", true, null);
            set_up_friend_list(await get_user());
        } else {
            alert(JSON.stringify(result));
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
        alert("Erreur de connexion au serveur.");
    }
}

async function create_account(event: Event): Promise<void> {
    event.preventDefault();
    console.log("create account appelé");
    
    const username = (document.getElementById("username") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const email = (document.getElementById("email") as HTMLInputElement).value;
    
    if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(username)) {
        return alert("Be carefull i can bite");
    }

    const response = await fetch("/create_account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email })
    });
    
    console.log(`username: ${username}`);
    console.log(`password: ${password}`);
    console.log(`email: ${email}`);
    
    const result: LoginResponse = await response.json();
    console.log(`result success:: ${result.success}`);

    if (result.success) {
        alert("Compte créé!");
        navigateTo("login", true, null);
    } else {
        alert("Erreur: utilisateur existant");
    }
}

async function logout(print: boolean): Promise<void> {
    await fetch("/logout", { method: "GET" });
    
    console.log(`print: ${print}`);
    if (print) {
        alert("Déconnexion!");
        navigateTo("", true, null);
    }
    close_users_socket();
}

async function uploadProfileImage() {
    const username = await get_user();
    const fileInput = document.getElementById('profileImage') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (file) {
        const formData = new FormData();
        formData.append('profileImage', file);
        
    try {
        const response = await fetch('/update_avatar', {
            method: 'POST',
            body: formData,
          });
        const data = await response.json();

      if (data.success) {
        alert('Image uploaded successfully!');
        console.log('Server response:', data);
      } else {
        console.log('Upload failed:', data);
        alert('Failed to upload image.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
}

async function modify_user(event: Event): Promise<void> {
    event.preventDefault();
    
    const newusername = (document.getElementById("username") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const email = (document.getElementById("email") as HTMLInputElement).value;
    
    console.log(`newusername: ${newusername}`);
    console.log(`password: ${password}`);
    console.log(`email: ${email}`);
    
    if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(newusername)) {
        return alert("Be carefull i can bite");
    }

    const username = await get_user(); 
    console.log(`oldusername: ${username}`);
    
    if (!username) {
        alert("Impossible de récupérer l'utilisateur!");

    } else {
        const response = await fetch("/modify_user", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({newusername, password, email, username})
        });
        
        const result: ModifyUserResponse = await response.json();
        
        if (result.success) {
            logout(false);
            alert("Modification effectuée!");
            navigateTo("login", true, null);
        } else {
            alert("Erreur lors de la modification.");
        }
    }
}
}