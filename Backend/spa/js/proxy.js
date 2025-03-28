const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");
const ejs = require("ejs");
const fs = require("fs");
const { pipeline } = require('stream');
const util = require('util');
const path = require('path');
const pump = util.promisify(pipeline);
const otplib = require('otplib');
const qrcode = require("qrcode");
const { authenticator } = require('otplib');

fastify.register(require('@fastify/multipart'), {
  attachFieldsToBody: true,
});

let usersession = new Map();

async function get_avatar(request, reply) {
    const {username} = request.body;
    const response = await axios.post("http://users:5000/get_avatar",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    return reply.send(response.data.avatar_name);
}

async function update_solo_score(req, reply) {

}

async function update_avatar(req, reply) {
    try {
      const token = req.cookies.session;
      const username = await get_user(token);

      if (!username) {
        return reply.send({ success: false, message: 'Utilisateur non authentifié' });
      }

      const data = await req.file();
      if (!data) {
        return reply.send({ success: false, message: "Aucun fichier reçu." });
      }

      const fileExtension = path.extname(data.filename);
      const filePath = '/usr/src/app/Frontend/avatar';
      const filename = `${username}${fileExtension}`;
      const fullPath = path.join(filePath, filename);

      // Vérifiez que le dossier d'avatar existe
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }

      await pump(data.file, fs.createWriteStream(fullPath));
      const response = await axios.post("http://users:5000/update_avatar",
        { username: username , avatar_name: filename },
        { headers: { "Content-Type": "application/json" } }
    );
    if (response.data.success) {
        reply.send({ success: true, message: "Avatar mis à jour avec succès." });
    }
    else {
        reply.send({ success: false, message: "Erreur lors de l'upload de l'avatar." });
    }
    } catch (error) {
      console.error("Erreur lors de l'upload de l'avatar :", error);
      reply.send({ success: false, message: "Erreur lors de l'upload de l'avatar." });
    }
  };

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
}).then(() => {
    console.log("✅ Plugin `@fastify/cookie` chargé !");
}).catch(err => {
    console.error("❌ Erreur lors de l'enregistrement du plugin :", err);
});

async function log(req, reply) {
    console.log("🔄 Redirection de /login vers users...");
    const {username} = req.body;
    const response = await axios.post("http://users:5000/login", req.body);
    const result = await response.data;
    if (result.success) {
        const {token , username, domain} = response.data;
        if ([...usersession.values()].some(user => user.username === username)) {
            return reply.send({success: false, message: `You are already loged`});
        }
        usersession.set(token, {username: username, status: 'online'});
        send_to_friend(username, token);
        return reply
        .setCookie("session", token, {
            path: "/",
            httpOnly: true,
            secure: true, // ⚠️ Mets `true` en prod (HTTPS obligatoire)
            maxAge: 18000,
            sameSite: "None",  // ⚠️ Indispensable pour autoriser le partage de cookies cross-origin
            domain: domain,  // ⚠️ Change en fonction de ton domaine
            partitioned: true  // ✅ Active la compatibilité avec "State Partitioning" de Firefox
        })
        .send({ success: true, message: `Bienvenue ${username}`});
    } else {
        return reply.send(result);
    }
}

async function create_account(req, reply) {
    try {
        console.log("🔄 Redirection de /create_account vers users...");
		let response;

		const { username, password, email, activeFA } = req.body;

		let i = 0;
		if(activeFA){
			while(secret_keys[i] && secret_keys[i][0] != username){
				i++;
			}

			if (!secret_keys[i]) {
				return reply.status(404).send({ success: false, error: "Utilisateur non trouvé" });
			}
			response = await axios.post("http://users:5000/create_account",
			{username, password, email, secretKey: secret_keys[i][1]},
			{ headers: { "Content-Type": "application/json" } })
			secret_keys[i] = "";
		}
		else{
			response = await axios.post("http://users:5000/create_account",
				{username, password, email},
				{ headers: { "Content-Type": "application/json" } }
		)};

        return reply.send(response.data);
    } catch (error) {
        const statuscode = error.response ? error.response.status : 500;
        const errormessage = error.response ? error.response.data.error : "Server Error";
        console.error("❌ Erreur API users:", error.message);
        return reply.code(statuscode).send({ error: errormessage });
    }
}

let users_connection = [];

async function Websocket_handling(username, connection) {
    users_connection[username] = connection;
}

async function get_user(token) {
    if (usersession.get(token))
        return usersession.get(token).username || null;
}

async function logout(token, reply) {
    let username = await get_user(token);
    if (usersession.has(token)) {
        usersession.delete(token);
        send_to_friend(username);
    }
}

async function settings(req, reply) {
    const response = await axios.post("http://users:5000/settings", req.body);
    if (response.data.new_file_name && response.data.old_file_name &&  response.data.old_file_name != "default.jpg") {
        const pathtoimage = "/usr/src/app/Frontend/avatar/";
        const oldFilePath = `${pathtoimage}${response.data.old_file_name}`;
        const newFilePath = `${pathtoimage}${response.data.new_file_name}`;
        if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, newFilePath);
        }
    }
    return reply.send(response.data);
}

async function update_solo_score(req, reply) {
    const response = await axios.post("http://users:5000/update_solo_score", req.body);
    reply.send(response.data);
}

async function update_history(req, reply) {
    const response = await axios.post("http://users:5000/update_history", req.body);
    reply.send(response.data);
}

async function get_stats(req, reply) {
    const {username} = req.body;


    const response = await axios.post("http://users:5000/get_history",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    return reply.send(response.data.stats);
}

async function get_history(req, reply) {
    const token = req.cookies.session;
    if (!token) { 
        return reply.view("login.ejs");
    }

    const username = await get_user(token);
    if (!username) {
        return reply.view("login.ejs");
    }


    const response = await axios.post("http://users:5000/get_history",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    return reply.view("history.ejs", { history: response.data.history, tournament: response.data.history_tournament, username: username });
}

async function end_tournament(req, reply) {
    const {classement} = req.body;
    const end_tournamentTemplate = fs.readFileSync("Frontend/templates/end_tournament.ejs", "utf8");
    const finalFile = ejs.render(end_tournamentTemplate, {classement: classement});

    reply.send(finalFile);
}

async function waiting_room(req, reply) {
    const response = await axios.post("http://pong:4000/waiting_room", req.body);
    reply.send(response.data);
}

async function ping_waiting_room(req, reply) {
    const response = await axios.post("http://ping:4002/ping_waiting_room", req.body);
    reply.send(response.data);
}

async function display_friends(username, connection) {
    console.log("username in display friends:")
    const data = await get_friends(username);
    const friends = data.friends;
    if (!friends) {
        return ;
    }
    for (let i = 0; i < friends.length; i++) {
        console.log(friends[i]);
        connection?.socket.send(JSON.stringify(friends[i]));
    }
    connection?.socket.send(JSON.stringify({display : true}));
}


async function send_to_friend(username, token) {
    let status = null;
    if (!usersession.has(token)) {
        status = "offline";
    }
    const response = await get_friends(username);
    if (!response.success) {
        return ;
    }
    let tab_of_friends = response.friends;
    for (let i = 0; i < tab_of_friends.length; i++) {
        if (tab_of_friends[i].status != "offline" && status == null) {
            users_connection[tab_of_friends[i].username]?.socket.send(JSON.stringify({username: username, status: usersession.get(token).status}));
        }
        else if (tab_of_friends[i].status != "offline") {
            users_connection[tab_of_friends[i].username]?.socket.send(JSON.stringify({username: username, status: status}));
        }
    }
}

async function update_status(req, reply) {
    const token = req.cookies.session;
    const {status} = req.body;
    usersession.get(token).status = status;
    send_to_friend(usersession.get(token).username, token);
}

async function add_friend(req, reply) {
    const {user_sending} = req.body;
    console.log("req.body in add friend", req.body);
    const response = await axios.post("http://users:5000/add_friend", req.body, {
        withCredentials: true
    });
    if (response.data.success && response.data.display)
    {
        console.log(user_sending);
        display_friends(user_sending, users_connection[user_sending]);
    }
   else if (response.data.succes) {
    }
    reply.send(response.data);
}

async function decline_friend(req, reply) {
	const response = await axios.post("http://users:5000/decline_friend", req.body, {
		withCredentials: true
	});
    reply.send(response.data);
}

async function pending_request(req, reply) {
    const response = await axios.post("http://users:5000/pending_request", req.body, {
        withCredentials: true
    });
    reply.send(response.data);
}

async function get_friends(username) {
    const response = await axios.post("http://users:5000/get_friends",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    let friends = response.data.friends;
    if (!friends) {
        return response.data;
    }
    let friends_and_status = [];
    for (let i = 0; i < friends.length; i++) {
        if ([...usersession.values()].some(user => user.username === friends[i].username)) {
            friends_and_status.push({username: friends[i].username, status:[...usersession.values()].find(user => user.username === friends[i].username)?.status});
        }
        else
            friends_and_status.push({username: friends[i].username, status: "offline"});
    }
    return ({success: true, friends: friends_and_status});
}

let secret_keys = [];

async function setup2fa(request, reply) {
	const { email, username } = request.body;

	if (!email) {
		console.log("Erreur : email inexistant");
		return reply.code(400).send({ error: 'email inexistant.' });
	}


    const userExists = await checkUserExists(username);
    if (userExists === true) {
        return reply.send({ success: false, message: "Check user : Utilisateur deja existant." });
    }

	try {
		// Générer le secret 2FA
		const secret = otplib.authenticator.generateSecret();
		if (!secret || typeof secret !== 'string') {
			console.error("Le secret généré n'est pas valide");
			return reply.code(500).send({ error: "Erreur lors de la generation du secret 2FA" });
		}

		// Générer l'URL pour le QR Code
		const otplibUrl = otplib.authenticator.keyuri(email, 'MyApp', secret);
		secret_keys.push([email, secret]);
		console.log("URL du QR Code generee :", otplibUrl);

		// Utiliser un async/await pour gérer correctement la génération du QR code
		const dataUrl = await new Promise((resolve, reject) => {
			qrcode.toDataURL(otplibUrl, (err, url) => {
				if (err) {
					console.error("Erreur lors de la generation du QR code:", err);
					return reject(err);
				}
				resolve(url);
			});
		});

		// Une fois le QR code généré, on envoie la réponse
		console.log("QR Code genere avec succes");
		return reply.send({ otplib_url: otplibUrl, qr_code: dataUrl });

	} catch (err) {
		console.error("Erreur serveur lors du traitement 2FA:", err);
		return reply.code(500).send({ error: "Erreur serveur lors de la mise en place du 2FA" });
	}
  };


async function twofaverify(request, reply) {
	try {
		const { email, code } = request.body;
		console.log(email);
		console.log(code);
		const response = await axios.post("http://users:5000/2fa/get_secret",
			{ email },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)

		if (!email || !code) {
			return reply.status(400).send({ success: false, error: "email et code requis" });
		}

		let i = 0;
		while(secret_keys[i] && secret_keys[i][0] != email){
			i++;
		}

        let sekret = response.data.secret;
        if (secret_keys[i])
            sekret = secret_keys[i][1];
		if (!sekret) {
			return reply.status(404).send({ success: false, error: "Utilisateur non trouvé" });
		}
        if (secret_keys[i])
            console.log("Secret_key : ", secret_keys[i][1]);
        console.log("Sekret : " ,response.data.secret);

		// Vérifier le code OTP avec la clé secrète
		const isValid = authenticator.check(code, sekret);
		if (!isValid) {
			return reply.status(401).send({ success: false, error: "Code 2FA invalide" });
		}

		// Répondre avec succès
		return reply.send({ success: true, message: "2FA vérifiée avec succès." });

	} catch (error) {
		console.error("Erreur de vérification 2FA:", error);
		return reply.status(500).send({ success: false, error: "Erreur serveur" });
	}
};

async function checkUserExists(username) {
	try {
		const response = await axios.post("http://users:5000/userExists",
			{ username },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
        const data = await response.data;
        return true;
    } catch (error) {
        console.error("Erreur:", error.message);
        return false;
    }
}

async function get_secret(email){
	try {
		const response = await axios.post("http://users:5000/2fa/get_secret",
			{ email },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
        const data = await response.data;
        return true;
    } catch (error) {
        console.error("Erreur:", error.message);
        return false;
    }
}

async function get_secret_two(email){
	try {
		const response = await axios.post("http://users:5000/2fa/get_secret",
			{ email },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
        const data = await response.data;
        return true;
    } catch (error) {
        console.error("Erreur:", error.message);
        return false;
    }
}

module.exports = { log , create_account , logout, get_user, settings, waiting_room, update_history, update_solo_score, get_history, end_tournament, add_friend, decline_friend, pending_request, get_friends, update_status, Websocket_handling, send_to_friend, display_friends, ping_waiting_room, get_avatar, update_avatar, get_stats, setup2fa, twofaverify, checkUserExists };
