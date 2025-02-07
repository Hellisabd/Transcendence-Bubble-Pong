const fastify = require("fastify")({
	logger: {
	  level: "warn",
	  transport: {
		target: "pino-pretty",
		options: {
		  ignore: "pid,hostname,time,reqId,responseTime", 
		  singleLine: true,
		},
	  },
	},
  });
  
  const cors = require("@fastify/cors");
  const path = require('path');
  const fastifystatic = require('@fastify/static');
  const view = require('@fastify/view');
  const fs = require('fs');
  const fastifySqlite = require('fastify-sqlite')

fastify.post('/login', async (request, reply) => {
	const { username, password } = request.body;
  
	if (!username || !password) {
		return reply.code(400).send({ success: false, error: "Champs manquants" });
	}
  
	//// 🔹 Exemple de validation (à adapter)
	// if (username === "admin" && password === "password") {
	//     return { success: true, message: "Connexion réussie !" };
	// } else {
	//     return reply.code(401).send({ success: false, error: "Identifiants incorrects" });
	// }
	return reply.send({ success: true, message: "Connexion réussie !" });
  });

fastify.post('/create_account', async (request, reply) => {
	const { name, email, password } = request.body;

    if (!name || !email || !password) {
        return reply.code(400).send({ success: false, error: "Champs manquants" });
    }

    try {
        const db = fastify.sqlite;

        // 🔹 Vérifier si l'utilisateur existe déjà
        const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUser) {
            return reply.code(409).send({ success: false, error: "L'utilisateur existe déjà" });
        }

        // 🔹 Insérer le nouvel utilisateur
        await db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password]);

        return reply.send({ success: true, message: "Compte créé avec succès !" });
    } catch (error) {
        console.error("❌ Erreur lors de la création du compte :", error.message);
        return reply.code(500).send({ error: "Erreur interne du serveur" });
    }
});

const dbFile = process.env.DB_FILE

fastify.register(fastifySqlite, {
  dbFile: dbFile,
});

console.log(`dbFile :::::: ${dbFile}`)


fastify.ready().then(async () => {
	const db = fastify.sqlite;
  
	await db.exec(`
	  CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT UNIQUE NOT NULL
	  )
	`);
  
	console.log("✅ Table 'users' créée/vérifiée !");
  });

fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`🚀 Serveur Users démarré sur ${address}`);
});
