console.log("login.ts chargé");

type LoginResponse = {
    success: boolean;
    message?: string;
};

type ModifyUserResponse = {
    success: boolean;
};

function sanitizeInput(input: string): string | boolean {
    if (typeof input !== "string") return false;
    if (input.length > 50) return false; // Empêche les inputs trop longs
    if (!/^[a-zA-Z0-9._@-]+$/.test(input)) return false; // Autorise lettres, chiffres, ., @, _, et -
    return input;
}

declare function navigateTo(page: string, addHistory: boolean, classement:  { username: string; score: number }[] | null): void;
declare function get_user(): Promise<string | null>;

async function login(event: Event): Promise<void> {
    event.preventDefault();

    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    if (!sanitizeInput(email) || !sanitizeInput(password)) {
        return alert("Be carefull i can bite");
    }


	const response = await fetch("/2fa/get_secret_two", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email })
	});

	const data = await response.json();
	console.log(data);


	if (data.success) {
		const code = prompt("Veuillez saisir votre code 2FA:");
		if (!code) return alert("Le code 2FA est requis pour vous connecter.");

		const verifResponse = await fetch("/2fa/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, code })
		});
		const verifResult = await verifResponse.json();

		if (!verifResult.success) {
			return alert("Code 2FA invalide.");
		}

	}
    try {
        let domain =  window.location.host.substring(0, window.location.host.indexOf(':'));
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, "domain": domain })
        });

        const result: LoginResponse = await response.json();

        if (result.success) {
            alert(JSON.stringify(result));
            navigateTo("index", true, null);
            set_up_friend_list(await get_user());
        } else {
            alert(JSON.stringify(result));
        }
    } catch (error) {
        alert("Erreur de connexion au serveur.");
    }
}

async function create_account(event: Event): Promise<void> {
	event.preventDefault();

	const username = (document.getElementById("name") as HTMLInputElement).value;
	const password = (document.getElementById("password_creation") as HTMLInputElement).value;
	const email = (document.getElementById("email_creation") as HTMLInputElement).value;
	const activeFA = (document.getElementById("twofa") as HTMLInputElement).checked;

	let repResult: any = null;
	let result: LoginResponse = { success: false };

	if (activeFA) {
		const rep = await fetch("/2fa/setup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, username})
		});

		const repjson = await rep.json();
		if (repjson.success == false){
			alert(repjson.message);
			return ;
		}

		try {
			repResult = repjson;
			if (repResult) {
				alert("2FA setup completed! Scan this QR code to complete the setup.");
				// Affiche le QR code dans une modal
				const qrCodeModal = document.createElement('div');
				qrCodeModal.innerHTML = `
					<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
								background: white; padding: 20px; border: 1px solid #ccc; z-index: 1000;">
						<p>Scan this QR Code:</p>
						<img src="${repResult.qr_code}" alt="QR Code" style="max-width: 100%;"/>
						<br/>
						<button id="qr-alert-close">Close</button>
					</div>`;
				document.body.appendChild(qrCodeModal);
				(document.getElementById("qr-alert-close") as HTMLButtonElement)?.addEventListener("click", () => {
					document.body.removeChild(qrCodeModal);
				});
			}
			console.log("2FA setup result:", repResult);
		} catch (e) {
			console.error("Erreur de parsing JSON pour 2FA setup:", e);
		}
	}

	// Si 2FA est activé et que le setup a fourni un résultat, demande la vérification du code
	if (activeFA && repResult) {
		try {
			await new Promise<void>((resolve, reject) => {
				const verifyModal = document.createElement('div');
				verifyModal.innerHTML = `
					<div style="position: fixed; top: 80%; left: 80%; transform: translate(-50%, -50%);
								background: white; padding: 20px; border: 1px solid #ccc; z-index: 1001;">
						<p>Entrez le code 2FA affiché par votre application authentificatrice:</p>
						<input id="qr-verify-code" type="text" style="width: 100%; margin-bottom: 10px;"/>
						<br/>
						<button id="qr-verify-submit">Vérifier</button>
						<button id="qr-verify-cancel">Annuler</button>
					</div>`;
				document.body.appendChild(verifyModal);
				const submitBtn = document.getElementById("qr-verify-submit") as HTMLButtonElement;
				const cancelBtn = document.getElementById("qr-verify-cancel") as HTMLButtonElement;

				submitBtn.addEventListener("click", async () => {
					const code = (document.getElementById("qr-verify-code") as HTMLInputElement).value;

					const verifResponse = await fetch("/2fa/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email, username, code })
					});

					const verifResult = await verifResponse.json();
					if (verifResult.success) {
						alert("2FA vérifiée avec succès.");
						document.body.removeChild(verifyModal);
						resolve();
					} else {
						alert("Code 2FA incorrect, réessayez.");
					}
				});

				cancelBtn.addEventListener("click", () => {
					document.body.removeChild(verifyModal);
					reject(new Error("2FA verification annulée"));
				});
			});
		} catch (error) {
			console.error("La vérification 2FA a échoué:", error);
			return;
		}
	}

	// Création du compte
	if (!activeFA || (activeFA && repResult != null)) {
		const response = await fetch("/create_account", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password, email, activeFA })
		});

		if (response.ok) {
			const responseText = await response.text();
			console.log("Reponse brute create_account:", responseText);
			if (responseText) {
				result = JSON.parse(responseText);
			}
		} else {
			console.error("Erreur serveur pour create_account:", response.statusText);
		}
	}
	console.log(result.success);
	if (result.success) {
		alert("Compte créé!");
		navigateTo("login", true, null);
	} else {
		alert("Erreur: utilisateur existant");
	}
}

async function logout(print: boolean): Promise<void> {
    await fetch("/logout", { method: "GET" });

    if (print) {
        alert("Déconnexion!");
        navigateTo("", true, null);
    }
    close_users_socket();
}

async function uploadProfileImage() {
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
        } else {
            alert('Failed to upload image.');
        }
        } catch (error) {
        console.error('Error uploading image:', error);
        }
    }
}

async function settings(event: Event): Promise<void> {
    event.preventDefault();

    const newusername = (document.getElementById("username") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const email = (document.getElementById("email") as HTMLInputElement).value;

    if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(newusername)) {
        return alert("Be carefull i can bite");
    }

    const username = await get_user();
    if (!username) {
        alert("Impossible de récupérer l'utilisateur!");

    } else {
        const response = await fetch("/settings", {
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




function fadeOutCard(page: 'create_account' | 'login'): void {
    if (page === 'create_account') {
        showRegister();
    } else {
        showLogin();
    }
}

function showLogin(): void {
    const regis = document.getElementById('register');
    const login = document.getElementById('login');

    if (regis && login) {
        login.classList.remove('hidden');
        login.classList.add('animate-leftFadeIn');
        regis.classList.add('hidden');
    }
}

function showRegister(): void {
    const regis = document.getElementById('register');
    const login = document.getElementById('login');

    if (regis && login) {
        login.classList.add('hidden');
        regis.classList.remove('hidden');
        regis.classList.add('animate-rightFadeIn');
    }
}
