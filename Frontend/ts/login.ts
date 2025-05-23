
declare const Swal: any;

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
        return (Swal.fire({
			text: "Be carefull i can bite!",
			icon: 'error'
		  }));
    }


	const response = await fetch("/2fa/get_secret_two", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email })
	});

	const data = await response.json();

	if (data.success) {
		const code = prompt("Please enter your 2FA code:");
		if (!code) 
			return (Swal.fire({
				text: "The 2FA code is required for connection!",
				icon: 'error'
			  }));

		const verifResponse = await fetch("/2fa/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, code })
		});
		const verifResult = await verifResponse.json();

		if (!verifResult.success) {
			return (Swal.fire({
				text: "Invalid 2FA code.",
				icon: 'error'
			  }));
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
            Swal.fire({
				text: "Welcome!",
				icon: 'success'
			  });
			set_up_friend_list(await get_user());
            navigateTo("pong_game", true, null);
        } else {
			Swal.fire({
				text: "Wrong informations!",
				icon: 'error'
			  });
        }
    } catch (error) {
		Swal.fire({
			text: "Connexion to server failed.",
			icon: 'error'
		  });
		}
	}
	
	async function faSettings() {
		const username =  await get_user();
		const rep = await fetch("/2fa/settings", {
			method: "GET",
		});
		const repResult = await rep.json();
		let qrCodeModal: HTMLElement | null = null;  // hold a reference to the QR code modal
		if (repResult.created) {
			Swal.fire({
				text: "2FA setup completed! Scan this QR code to complete the setup.",
				icon: 'success'
			});
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
			await new Promise<void>((resolve, reject) => {
				const verifyModal = document.createElement('div');
				let create_account_card = document.getElementById('content') as HTMLDivElement;
				verifyModal.innerHTML = `
					<div class="bulle w-fit fixed top-[65%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-[#c0b9ac] hover:scale-105 hover:shadow-2xl hover:shadow-[#efe5d1]">
						<p class="text-center font-canted mb-2">Enter your 2fa code</p>
						<input class="mx-auto block" id="qr-verify-code" type="text"/>
						<div class ="flex justify-around mt-4">
							<button id="qr-verify-submit" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Check</button>
							<button id="qr-alert-annuler" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Cancel</button>
						</div>
					</div>`;
				document.body.appendChild(verifyModal);
				const submitBtn = document.getElementById("qr-verify-submit") as HTMLButtonElement;
				(document.getElementById("qr-alert-annuler") as HTMLButtonElement)?.addEventListener("click", () => {
						if (qrCodeModal && document.body.contains(qrCodeModal)) {
							document.body.removeChild(qrCodeModal);
							create_account_card.classList.remove('hidden');
							if (document.body.contains(verifyModal))
								document.body.removeChild(verifyModal);
				
						}
						fetch("/2fa/delete_thing", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ username })
						});
					});
				
				submitBtn.addEventListener("click", async () => {
					const code = (document.getElementById("qr-verify-code") as HTMLInputElement).value;
					create_account_card.classList.remove('hidden'); 
					const verifResponse = await fetch("/2fa/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email: repResult.email, username: repResult.username, code })
					});

					const verifResult = await verifResponse.json();
					if (verifResult.success) {
						Swal.fire({
							text: "2FA code successfully checked!",
							icon: 'success'
						});
						if (document.body.contains(verifyModal)) document.body.removeChild(verifyModal);
						// Close the QR code modal if it is still open
						if (qrCodeModal && document.body.contains(qrCodeModal)) {
							document.body.removeChild(qrCodeModal);
						}
						resolve();
						fetch("/2fa/insert", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email: repResult.email, username: repResult.username})
					});
					} else {
						Swal.fire({
							text: "Incorrect 2FA code, please try again.",
							icon: 'error'
						});
					}
				});
			});
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
			Swal.fire({
				text: repjson.message,
				icon: 'error'
			});
			return;
		}

		try {
			repResult = repjson;
			if (repResult) {
				Swal.fire({
					text: "2FA setup completed! Scan this QR code to complete the setup.",
					icon: 'success'
				});
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
		} catch (e) {
			console.log("2FA error");
		}
	}

	// If 2FA is active and a setup result exists, perform code verification
	if (activeFA && repResult) {
		try {
			const username =  await get_user();
			await new Promise<void>((resolve, reject) => {
				const verifyModal = document.createElement('div');
				let create_account_card = document.getElementById('content') as HTMLDivElement;
				verifyModal.innerHTML = `
					<div class="bulle w-fit fixed top-[65%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-[#c0b9ac] hover:scale-105 hover:shadow-2xl hover:shadow-[#efe5d1]">
						<p class="text-center font-canted mb-2">Enter your 2fa code</p>
						<input class="mx-auto block" id="qr-verify-code" type="text"/>
						<div class ="flex justify-around mt-4">
							<button id="qr-verify-submit" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Check</button>
							<button id="qr-alert-annuler" class="underline hover:text-indigo-400 text-neutral-200 font-semibold text-sm transition-all">Cancel</button>
						</div>
					</div>`;
				document.body.appendChild(verifyModal);
				const submitBtn = document.getElementById("qr-verify-submit") as HTMLButtonElement;

				(document.getElementById("qr-alert-annuler") as HTMLButtonElement)?.addEventListener("click", () => {
					if (qrCodeModal && document.body.contains(qrCodeModal)) {
						document.body.removeChild(qrCodeModal);
						create_account_card.classList.remove('hidden');
						if (document.body.contains(verifyModal))
							document.body.removeChild(verifyModal);
						reject(new Error("2FA verification annulée"));
						fetch("/2fa/delete_thing", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ username})
						});
					}
				});
				submitBtn.addEventListener("click", async () => {
					const code = (document.getElementById("qr-verify-code") as HTMLInputElement).value;
					create_account_card.classList.remove('hidden');
					const verifResponse = await fetch("/2fa/verify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email, username, code })
					});

					const verifResult = await verifResponse.json();
					if (verifResult.success) {
						Swal.fire({
							text: "2FA code successfully checked!",
							icon: 'success'
						});
						if (document.body.contains(verifyModal)) document.body.removeChild(verifyModal);
						// Close the QR code modal if it is still open
						if (qrCodeModal && document.body.contains(qrCodeModal)) {
							document.body.removeChild(qrCodeModal);
						}
						resolve();
					} else {
						Swal.fire({
							text: "Incorrect 2FA code, please try again.",
							icon: 'error'
						});
					}
				});
			});
		} catch (error) {
			console.log("2FA error");
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
			if (responseText) {
				result = JSON.parse(responseText);
			}
		} 
	}
	if (result.success) {
		Swal.fire({
			text: "Account successfully created!",
			icon: 'success'
		});
		navigateTo("login", true, null);
	} else {
		Swal.fire({
			text: "User name already used.",
			icon: 'error'
		});
	}
}

async function logout(print: boolean): Promise<void> {
	await fetch("/logout", { method: "GET" });

	if (print) {
		Swal.fire({
			text: "Bye! See you soon!",
			icon: 'success'
		});
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
			Swal.fire({
				text: "Image uploaded successfully!",
				icon: 'success'
			});
        } else {
			Swal.fire({
				text: "Failed to upload image.",
				icon: 'error'
			});
        }
        } catch (error) {
        	console.log('Error uploading image.');
        }
    }
}

async function settings(event: Event): Promise<void> {
    event.preventDefault();

    const newusername = (document.getElementById("username") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const email = (document.getElementById("email") as HTMLInputElement).value;

    if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(newusername)) {
        return (Swal.fire({
			text: "Be carefull i can bite!",
			icon: 'error'
		  }));
    }

    const username = await get_user();
    if (!username) {
		Swal.fire({
			text: "Unable to retrieve user!",
			icon: 'error'
		});

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
			Swal.fire({
				text: "Modification done!",
				icon: 'success'
			});
            navigateTo("login", true, null);
        } else {
			Swal.fire({
				text: "Error while modifying infos.",
				icon: 'error'
			});
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
