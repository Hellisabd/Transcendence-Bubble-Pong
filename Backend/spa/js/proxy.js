const fastify = require("fastify")();
const axios = require("axios");
const fastifyCookie = require("@fastify/cookie");

let usersession = {}

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
}).then(() => {
    console.log("✅ Plugin `@fastify/cookie` chargé !");
}).catch(err => {
    console.error("❌ Erreur lors de l'enregistrement du plugin :", err);
});

async function log(req, reply) {
    try {
        console.log("🔄 Redirection de /login vers users...");
        
        const response = await axios.post("http://users:5000/login", req.body);
        console.log(response.data);
        const {token , username} = response.data;
        usersession[token] = username;
        return reply
        .setCookie("session", token, {
            path: "/",
            httpOnly: true,  
            secure: true, // ⚠️ Mets `true` en prod (HTTPS obligatoire)
            maxAge: 18000,  
            sameSite: "None",  // ⚠️ Indispensable pour autoriser le partage de cookies cross-origin
            domain: "localhost",  // ⚠️ Change en fonction de ton domaine
            partitioned: true  // ✅ Active la compatibilité avec "State Partitioning" de Firefox
        })
        .send({ success: true, message: `Bienvenue ${username}`});
    } catch (error) {
        console.error("❌ Erreur API users:", error.message);
        return reply.code(500).send({ error: "Erreur interne du serveur SPA" });
    }
}

async function create_account(req, reply) {
    try {
        console.log("🔄 Redirection de /create_account vers users...");
        
        const response = await axios.post("http://users:5000/create_account", req.body, {
            withCredentials: true
        });
        return reply.send(response.data);
    } catch (error) {
        console.error("❌ Erreur API users:", error.message);
        return reply.code(500).send({ error: "Erreur interne du serveur SPA" });
    }
}

async function get_user(token) {
    return usersession[token] || null;
}

async function logout(token, reply) {
    delete usersession[token];
}

module.exports = { log , create_account , logout, get_user };