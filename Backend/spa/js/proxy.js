const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");
const ejs = require("ejs");
const fs = require("fs");

let usersession = {}

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
}).then(() => {
    console.log("✅ Plugin `@fastify/cookie` chargé !");
}).catch(err => {
    console.error("❌ Erreur lors de l'enregistrement du plugin :", err);
});

async function log(req, reply) {
    console.log("🔄 Redirection de /login vers users...");
    
    const response = await axios.post("http://users:5000/login", req.body);
    const result = await response.data;
    if (result.success) {
        console.log(response.data);
        const {token , username, domain} = response.data;
        console.log(`domain::: ${domain}`);
        usersession[token] = username;
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
        return reply.send({success: false});
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
    return usersession[token] || null;
}

async function logout(token, reply) {
    delete usersession[token];
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
    console.log("lol");
    const token = req.cookies.session;
        if (!token) {
            return reply.status(401).send({ success: false, message: "Token manquant" });
        }

        const username = await get_user(token);
        if (!username) {
            return reply.status(401).send({ success: false, message: "Utilisateur non authentifié" });
        }

        console.log("Envoi de la requête à /get_history pour :", username);

        const response = await axios.post("http://users:5000/get_history",
            { username },  // ✅ Envoie le JSON correctement
            { headers: { "Content-Type": "application/json" } }
        );
        const historyTemplate = fs.readFileSync("Frontend/templates/history.ejs", "utf8");
        console.log("Réponse reçue :", response.data);
        const finalFile = ejs.render(historyTemplate, {history: response.data.history}); 
        console.log(finalFile);
        reply.send(finalFile);
}

async function waiting_room(req, reply) {
    const response = await axios.post("http://pong:4000/waiting_room", req.body);
    reply.send(response.data);
}


module.exports = { log , create_account , logout, get_user, modify_user, waiting_room, update_history, get_history };