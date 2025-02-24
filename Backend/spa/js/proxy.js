const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");
const ejs = require("ejs");
const fs = require("fs");

let usersession = new Map();

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
            return reply.send({succes: false, message: `You are already loged`});
        }
        console.log(`domain::: ${domain}`);
        usersession.set(token, {username: username, status: "online"});
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


async function get_user(token) {
    if (usersession.get(token))
        return usersession.get(token).username || null;
}

async function logout(token, reply) {
    if (usersession.get(token))
        delete usersession.get(token);
}

async function modify_user(req, reply) {
    const response = await axios.post("http://users:5000/modify_user", req.body, {
        withCredentials: true
    });
    reply.send(response.data);
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
    const finalFile = ejs.render(historyTemplate, {history: response.data.history, tournament: response.data.history_tournament}); 
    console.log(finalFile);
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

async function update_status(req, reply) {
    const token = req.cookies.session;
    const {status} = req.body;
    usersession[token].status = status;

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

async function get_friends(req, reply) {
    console.log("passe dans online users");
    const {username}  = req.body;
    const response = await axios.post("http://users:5000/get_friends",
        { username },  // ✅ Envoie le JSON correctement
        { headers: { "Content-Type": "application/json" } }
    );
    console.log("retour de get_friends: ", response.data);
    let friends = response.data.friends;
    console.log(`friends:: ${friends} length : ${friends.length}`);
    let friends_and_status = [];
    for (let i = 0; i < friends.length; i++) {
        if ([...usersession.values()].some(user => user.username === friends[i].username)) {
            friends_and_status.push({username: friends[i].username, status: "online"});
        }
        else
            friends_and_status.push({username: friends[i].username, status: "offline"});
    }
    console.log(`friends_and_status::: ${friends_and_status}`)
    return reply.send(JSON.stringify({succes: true, friends: friends_and_status}));
}

module.exports = { log , create_account , logout, get_user, modify_user, waiting_room, update_history, get_history, end_tournament, add_friend, pending_request, get_friends };