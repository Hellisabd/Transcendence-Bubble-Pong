const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");
const ejs = require("ejs");
const fs = require("fs");
const { pipeline } = require('stream');
const util = require('util');
const path = require('path');
const pump = util.promisify(pipeline);

fastify.register(require('@fastify/multipart'), {
  attachFieldsToBody: true,
});

let usersession = new Map();

async function get_avatar(request, reply) {
    const {username} = request.body;
    console.log("username dans get_avatar", username);
    const response = await axios.post("http://users:5000/get_avatar",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    return reply.send(response.data.avatar_name);
}

async function update_avatar(req, reply) {
    try {
        console.log("passe dans update avatr");
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
        console.log(`Fichier téléchargé avec succès : ${fullPath}`);
        reply.send({ success: true, message: "Avatar mis à jour avec succès." });
    }
    else {
        console.log("data.succes is false");
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
    console.log(username);
    const response = await axios.post("http://users:5000/login", req.body);
    const result = await response.data;
    if (result.success) {
        console.log(response.data);
        const {token , username, domain} = response.data;
        if ([...usersession.values()].some(user => user.username === username)) {
            return reply.send({success: false, message: `You are already loged`});
        }
        console.log(`domain::: ${domain}`);
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

        const response = await axios.post("http://users:5000/create_account", req.body, {
            withCredentials: true
        });
        console.log(response.data);
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
        console.log("passe dans logout", usersession.get(token));
        send_to_friend(username);
    }
}

async function modify_user(req, reply) {
    console.log("envoie au container user depuis spa dans modify user");
    const response = await axios.post("http://users:5000/modify_user", req.body);
    if (response.data.new_file_name && response.data.old_file_name &&  response.data.old_file_name != "default.jpg") {
        const pathtoimage = "/usr/src/app/Frontend/avatar/";
        const oldFilePath = `${pathtoimage}${response.data.old_file_name}`;
        const newFilePath = `${pathtoimage}${response.data.new_file_name}`;
        console.log(oldFilePath);
        console.log(newFilePath);
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

async function get_history(req, reply) {
    const token = req.cookies.session;
    if (!token) {
        return reply.status(401).send({ success: false, message: "Token manquant" });
    }

    const username = await get_user(token);
    if (!username) {
        return reply.view("login.ejs");        
    }

    console.log("Envoi de la requête à /get_history pour :", username);

    const response = await axios.post("http://users:5000/get_history",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    const historyTemplate = fs.readFileSync("Frontend/templates/history.ejs", "utf8");
    console.log("Réponse reçue :", response.data);
    // reply.send(finalFile);
    return reply.view("history.ejs", { history: response.data.history, tournament: response.data.history_tournament });
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

async function display_friends(username, connection) {
    console.log(`username: ${username}`);
    const data = await get_friends(username);
    const friends = data.friends;
    if (!friends) {
        return ;
    }
    for (let i = 0; i < friends.length; i++) {
        connection.socket.send(JSON.stringify(friends[i]));
    }
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
            users_connection[tab_of_friends[i].username].socket.send(JSON.stringify({username: username, status: usersession.get(token).status}));
        }
        else if (tab_of_friends[i].status != "offline") {
            users_connection[tab_of_friends[i].username].socket.send(JSON.stringify({username: username, status: status}));
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
    const response = await axios.post("http://users:5000/add_friend", req.body, {
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
    console.log("passe dans online users");
    const response = await axios.post("http://users:5000/get_friends",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    console.log("retour de get_friends: ", response.data);
    let friends = response.data.friends;
    if (!friends) {
        return response.data;
    }
    console.log(`friends:: ${friends} length : ${friends.length}`);
    let friends_and_status = [];
    for (let i = 0; i < friends.length; i++) {
        if ([...usersession.values()].some(user => user.username === friends[i].username)) {
            friends_and_status.push({username: friends[i].username, status:[...usersession.values()].find(user => user.username === friends[i].username)?.status});
        }
        else
            friends_and_status.push({username: friends[i].username, status: "offline"});
    }
    console.log(`friends_and_status::: ${friends_and_status}`)
    return ({success: true, friends: friends_and_status});
}

module.exports = { log , create_account , logout, get_user, modify_user, waiting_room, update_history, get_history, end_tournament, add_friend, pending_request, get_friends, update_status, Websocket_handling, send_to_friend, display_friends, get_avatar, update_avatar };
