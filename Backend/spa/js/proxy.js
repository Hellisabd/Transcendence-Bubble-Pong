const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");
const ejs = require("ejs");
const fs = require("fs");
const fsp  = fs.promises;
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

function sanitizeInput(input) {
    if (typeof input !== "string") return false;
    if (input.length > 50) return false; // Empêche les inputs trop longs
    if (!/^[a-zA-Z0-9._@-]+$/.test(input)) return false; // Autorise lettres, chiffres, ., @, _, et -
    return input;
  }

let usersession = new Map();

async function get_avatar(request, reply) {
    const {username} = request.body;
    if (!sanitizeInput(username))
        return reply.send({ success: false, message: 'Unauthorized' });
    const response = await axios.post("http://users:5000/get_avatar",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    return reply.send(response.data.avatar_name);
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
      if ((fileExtension != ".png" && fileExtension != ".webp" && fileExtension != ".jpg")) {
        return reply.send({ success: false, message: 'Wrong file extension' });
      }
      CHUNK_SIZE = 12;
      let buffer = await data.file.read(CHUNK_SIZE);
      if (!checkMagicNumber(buffer, fileExtension)) {
        return reply.send({ success: false, message: 'Wrong file extension' });
      }
      data.file.unshift(buffer);
      const filePath = '/usr/src/app/Frontend/avatar';
      const filename = `${username}${fileExtension}`;
      const fullPath = path.join(filePath, filename);
      const files = await fsp.readdir(filePath);
      for (let i = 0; i < files.length; i++) {
        const basename = files[i].split(".");
        let name_before_extension;
        for (let index = 0; index < basename.length - 1; index++){
            if (index == 0)
                name_before_extension = basename[index]; 
            else 
                name_before_extension += basename[index]; 
        }
        if (name_before_extension == username) {
            await fsp.unlink(path.join(filePath, files[i]))
        }
      }
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
      reply.send({ success: false, message: "Erreur lors de l'upload de l'avatar." });
    }
};

function checkMagicNumber(buffer, ext) {
    const hex = buffer.toString('hex');

    // PNG (8 octets)
    if (ext == ".png" && hex.startsWith('89504e470d0a1a0a')) return true;
    // JPEG (3 octets)
    if (ext == ".jpg" && hex.startsWith('ffd8ff')) return true;
    // WEBP ("RIFF....WEBP")
    if (ext == ".webp" && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

    return false;
}

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
});

async function log(req, reply) {
    const response = await axios.post("http://users:5000/login", req.body);
    const result = await response.data;
    if (result.success) {
        const {token , username, domain} = response.data;
        for (const [oldToken, session] of usersession.entries()) {
            if (session.username === username) {
                usersession.delete(oldToken);
                break;
            }
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
		let response;

		const { username, password, email, activeFA } = req.body;
        if (!sanitizeInput(username) || !sanitizeInput(password) || !sanitizeInput(email))
            return reply.send({ success: false, message: 'Unauthorized' });

		let i = 0;
		if(activeFA){
			while(secret_keys[i] && secret_keys[i][0] != email){
				i++;
			}

			if (!secret_keys[i]) {
				return reply.send({ success: false, error: "Utilisateur non trouvé" });
			}
			response = await axios.post("http://users:5000/create_account",
			{username, password, email, secretKey: secret_keys[i][1]},
			{ headers: { "Content-Type": "application/json" } })
            secret_keys.splice(i, 1);
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
        return reply.send({ error: errormessage });
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

async function update_history(req, reply) {
    const response = await axios.post("http://users:5000/update_history", req.body);
    reply.send(response.data);
}

async function get_stats(req, reply) {
    const {username} = req.body;

    if (!sanitizeInput(username))
        return reply.send({ success: false, message: 'Unauthorized' });
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
    if (!sanitizeInput(classement))
        return reply.send({ success: false, message: 'Unauthorized' });
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
    const data = await get_friends(username);
    const friends = data.friends;
    if (!friends) {
        return ;
    }
    for (let i = 0; i < friends.length; i++) {
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
    if (!token)
        return ;
    const {status} = req.body;
    if (!sanitizeInput(status))
        return ;
    if (!usersession.get(token))
        return ;
    usersession.get(token).status = status;
    send_to_friend(usersession.get(token).username, token);
}

async function get_status(req, reply) {
    const token = req.cookies.session;
    return reply.send(JSON.stringify({status: usersession.get(token)?.status}));
}

async function add_friend(req, reply) {
    const {user_sending, user_to_add} = req.body;
    if (!sanitizeInput(user_sending))
        return reply.send({success : false});
    const token = req.cookies.session;
    const response = await axios.post("http://users:5000/add_friend", req.body, {
        withCredentials: true
    });
    if (response.data.success && response.data.display)
    {
        display_friends(user_sending, users_connection[user_sending]);
        display_friends(user_to_add, users_connection[user_to_add]);
    }
    if (response.data.user_added) {
        users_connection[response.data.user_added]?.socket.send(JSON.stringify({pending_request: true}));
    }
    return reply.send(response.data);
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

	if (!sanitizeInput(email) || !sanitizeInput(username)) {
		return reply.send({ error: 'email inexistant.' });
	}


    const userExists = await checkUserExists(username);
    if (userExists === true) {
        return reply.send({ success: false, message: "Check user : user already exists." });
    }

	try {
		// Générer le secret 2FA
		const secret = otplib.authenticator.generateSecret();
		if (!secret || typeof secret !== 'string') {
			return reply.send({ error: "Erreur lors de la generation du secret 2FA" });
		}

		// Générer l'URL pour le QR Code
		const otplibUrl = otplib.authenticator.keyuri(email, 'MyApp', secret);
		secret_keys.push([email, secret]);

		// Utiliser un async/await pour gérer correctement la génération du QR code
		const dataUrl = await new Promise((resolve, reject) => {
			qrcode.toDataURL(otplibUrl, (err, url) => {
				if (err) {
					return reject(err);
				}
				resolve(url);
			});
		});

		// Une fois le QR code généré, on envoie la réponse
		return reply.send({ otplib_url: otplibUrl, qr_code: dataUrl });

	} catch (err) {
		return reply.send({ error: "Erreur serveur lors de la mise en place du 2FA" });
	}
  };

async function insert2fa(request, reply) {
    const {email} = request.body;
    let i = 0; 
    while(secret_keys[i] && secret_keys[i][0] != email){
        i++;
    }

    if (!secret_keys[i]) {
        return reply.send({ success: false});
    }
    response = await axios.post("http://users:5000/insert_secret",
    {email, secretKey: secret_keys[i][1]},
    { headers: { "Content-Type": "application/json" } })
    secret_keys.splice(i, 1);
}

async function twofaSettings(request, reply) {
    const token = request.cookies.session;
    const username = await get_user(token);
    const response = await axios.post("http://users:5000/get_email",
			{ username },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
    if (response.data.fa) {
        axios.post("http://users:5000/remove_secret",
			{ username },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
        return reply.send({removed: true})
    }
    else {
        const secret = otplib.authenticator.generateSecret();
		if (!secret || typeof secret !== 'string') {
			return reply.send({ error: "Erreur lors de la generation du secret 2FA" });
		}

		// Générer l'URL pour le QR Code
		const otplibUrl = otplib.authenticator.keyuri(response.data.email, 'MyApp', secret);
		secret_keys.push([response.data.email, secret]);

		// Utiliser un async/await pour gérer correctement la génération du QR code
		const dataUrl = await new Promise((resolve, reject) => {
			qrcode.toDataURL(otplibUrl, (err, url) => {
				if (err) {
					return reject(err);
				}
				resolve(url);
			});
		});

		return reply.send({ created: true, email: response.data.email, username: response.data.username, otplib_url: otplibUrl, qr_code: dataUrl });
    }    
}

async function twofaverify(request, reply) {
	try {
		const { email, code } = request.body;
        if (!sanitizeInput(email) || !sanitizeInput(code))
            return reply.send({ success: false, error: "Nope" });
		const response = await axios.post("http://users:5000/2fa/get_secret",
			{ email },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)

		if (!email || !code) {
			return reply.send({ success: false, error: "email et code requis" });
		}

		let i = 0;
		while(secret_keys[i] && secret_keys[i][0] != email){
			i++;
		}
        let sekret = response.data.secret;
        if (secret_keys[i])
            sekret = secret_keys[i][1];
		if (!sekret) {
			return reply.send({ success: false, error: "Utilisateur non trouvé" });
		}
        const isValid = authenticator.check(code, sekret);
        if (!isValid) {
            return reply.send({ success: false, error: "Code 2FA invalide" });
        }
		return reply.send({ success: true, message: "2FA vérifiée avec succès." });

	} catch (error) {
		return reply.send({ success: false, error: "Erreur serveur" });
	}
};

async function get_email(token) {
    const username = await get_user(token);
    const response = await axios.post("http://users:5000/get_email",
			{ username },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
    return response.data.email;
}

async function delete_thing(request, reply) {
    const {username} = request.body; 
    const token = request.cookies.session;
    const db_user = await get_user(token)
    const db_email = await get_email(token);
    if (username != db_user)
        return ;
    let i = 0;
    while(secret_keys[i] && secret_keys[i][0] != db_email){
        i++;
    }
    secret_keys.splice(i, 1);
}


async function checkUserExists(username) {
	try {
		const response = await axios.post("http://users:5000/userExists",
			{ username },  // ✅ Envoie le JSON correctement
			{ headers: { "Content-Type": "application/json" } }
		)
        const data = await response.data;
        return data.success;
    } catch (error) {
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
        return false;
    }
}

module.exports = { log , create_account , insert2fa,logout, get_user, settings, twofaSettings, delete_thing, waiting_room, update_history, get_history, end_tournament, add_friend, decline_friend, pending_request, get_friends, update_status, Websocket_handling, send_to_friend, display_friends, ping_waiting_room, get_avatar, update_avatar, get_stats, setup2fa, twofaverify, checkUserExists, get_status };
