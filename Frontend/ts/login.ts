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
	let qrCodeModal: HTMLElement | null = null;  // hold a reference to the QR code modal

	if (activeFA) {
		const rep = await fetch("/2fa/setup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, username })
		});

		const repjson = await rep.json();
		if (repjson.success == false) {
			alert(repjson.message);
			return;
		}

		try {
			repResult = repjson;
			if (repResult) {
				alert("2FA setup completed! Scan this QR code to complete the setup.");
				// Create and display the QR code modal
				let create_account_card = document.getElementById('content') as HTMLDivElement;
				create_account_card.classList.add('hidden');
				qrCodeModal = document.createElement('div');
				qrCodeModal.innerHTML = `
					<div class="bulle fixed top-[40%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-[#c0b9ac] hover:scale-105 hover:shadow-2xl hover:shadow-[#efe5d1]">
						<h2 class="text-center text-2xl font-bold font-kablam mb-4 tracking-[0.1em]">QR CODE</h2>
						<img class="mx-auto mb-4 min-w-[100%]" src="${repResult.qr_code}" alt="QR Code"/>
					</div>`;
				document.body.appendChild(qrCodeModal);
			}
			console.log("2FA setup result:", repResult);
		} catch (e) {
			console.error("Erreur de parsing JSON pour 2FA setup:", e);
		}
	}

	// If 2FA is active and a setup result exists, perform code verification
	if (activeFA && repResult) {
		try {
			await new Promise<void>((resolve, reject) => {
				const verifyModal = document.createElement('div');
				let create_account_card = document.getElementById('content') as HTMLDivElement;
				verifyModal.innerHTML = `
					<div class="bulle w-fit fixed top-[65%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-[#c0b9ac] hover:scale-105 hover:shadow-2xl hover:shadow-[#efe5d1]">
						<p class="text-center font-canted mb-2">Entrez votre code 2fa</p>
						<input class="mx-auto block" id="qr-verify-code" type="text"/>
						<div class ="flex justify-around mt-4">
							<button id="qr-verify-submit" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Vérifier</button>
							<button id="qr-alert-annuler" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Annuler</button>
						</div>
					</div>`;
				document.body.appendChild(verifyModal);
				const submitBtn = document.getElementById("qr-verify-submit") as HTMLButtonElement;

				(document.getElementById("qr-alert-annuler") as HTMLButtonElement)?.addEventListener("click", () => {
					if (qrCodeModal && document.body.contains(qrCodeModal)) {
						document.body.removeChild(qrCodeModal);
						create_account_card.classList.remove('hidden');
						if (document.body.contains(verifyModal)) document.body.removeChild(verifyModal);
							reject(new Error("2FA verification annulée"));
					}
				});
				submitBtn.addEventListener("click", async () => {
					const code = (document.getElementById("qr-verify-code") as HTMLInputElement).value;
					console.log("Code 2FA entré ipipipipipipip:", code);
					const verifResponse = await fetch("/2fa/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email, username, code })
					});

					const verifResult = await verifResponse.json();
					if (verifResult.success) {
						alert("2FA vérifiée avec succès.");
						if (document.body.contains(verifyModal)) document.body.removeChild(verifyModal);
						// Close the QR code modal if it is still open
						if (qrCodeModal && document.body.contains(qrCodeModal)) {
							document.body.removeChild(qrCodeModal);
						}
						resolve();
					} else {
						alert("Code 2FA incorrect, réessayez.");
					}
				});
			});
		} catch (error) {
			console.error("La vérification 2FA a échoué:", error);
			return;
		}
	}

	// Account creation
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
