const axios = require("axios");

async function log(req, reply) {
    try {
        console.log("🔄 Redirection de /login vers users...");
        
        const response = await axios.post("http://users:5000/login", req.body);
        return reply.send(response.data);
    } catch (error) {
        console.error("❌ Erreur API users:", error.message);
        return reply.code(500).send({ error: "Erreur interne du serveur SPA" });
    }
}

async function create_account(req, reply) {
    try {
        console.log("🔄 Redirection de /create_account vers users...");
        
        const response = await axios.post("http://users:5000/create_account", req.body);
        return reply.send(response.data);
    } catch (error) {
        console.error("❌ Erreur API users:", error.message);
        return reply.code(500).send({ error: "Erreur interne du serveur SPA" });
    }
}

module.exports = { log , create_account };