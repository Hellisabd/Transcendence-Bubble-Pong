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
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { request } = require("http");

const SALT_ROUNDS = 10;

fastify.register(cors, {
  origin: "http://spa:7000",
  credential: true
});

const generateToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '5h' });
};
// 📌 Chargement de la base de données
const dbFile = process.env.DB_FILE || "/usr/src/app/dataBase/core.db";

// 📌 Vérifier et créer le dossier dataBase s'il n'existe pas
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  console.log("📌 Création du dossier dataBase...");
  fs.mkdirSync(dbDir, { recursive: true });
}


// 📌 Initialiser la base SQLite
const db = new Database(dbFile);
console.log(`📌 Base de données utilisée : ${dbFile}`);

// 🔹 Création de la table "users" si elle n'existe pas
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS match_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_username TEXT NOT NULL,
    player2_username TEXT NOT NULL,
    winner_username TEXT NOT NULL,
    looser_username TEXT NOT NULL,
    player1_score INTEGER NOT NULL DEFAULT 0,
    player2_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// 🔍 Vérifier les tables existantes
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
console.log("📌 Tables trouvées dans SQLite:", tables);

// 🚀 Lancement du serveur
fastify.listen({ port: 5000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Serveur Users démarré sur ${address}`);
});

// 🔹 Route POST pour le login
fastify.post("/login", async (request, reply) => {
  const { email, password , domain} = request.body;
  if (!email || !password) {
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }
  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    console.log(user);
    if (!user)
        return reply.send({ success: false, error: "Connexion Echouée : invalid email" });
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return reply.send({ success: false, error: "Connexion échouée : Mot de passe incorrect" });
    const token = generateToken(user);
    return reply.send({ success: true, token, username: user.username, "domain": domain });
  } catch (error) {
    return reply.code(500).send({ success: false, error: "Erreur interne du serveur" });
  }
});

fastify.post("/modify_user", async (request, reply) => {
  const { email, password, newusername, username } = request.body;
  console.log(`newusername: ${newusername}`);
  console.log(`password: ${password}`);
  console.log(`email: ${email}`);
  console.log(`oldusername: ${username}`);
  if (!email || !password || !newusername || !username) {
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }
  try {
    const newpassword = await bcrypt.hash(password, SALT_ROUNDS);
    const stmt = db.prepare("UPDATE users SET username = ?, email = ?, password = ? WHERE username = ?");
    const result = stmt.run(newusername, email, newpassword, username);
    console.log("ici");
    if (result.changes > 0) {
      return reply.send({succes: true});
    } else {
      return reply.send({success: false});
    }
  } catch (error) {
    return reply.code(500).send({ success: false, error: "Erreur interne du serveur" });
  }
});

fastify.get("/me", async (request, reply) => {
  try {
    const token = request.cookies.session;
    if (!token) {
      return reply.code(402).send({success: false, error: "Non autorise"});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return reply.send({ success: true, user : decoded});
  } catch {
    return reply.code(401).send({ success: false, error: "Token invalide" });
  }
});

fastify.post('/logout', async (request, reply) => {
  reply
    .clearCookie('session', { path: '/' })
    .send({ success: true, message: 'Déconnecté' });
});

fastify.post("/get_history", async (request, reply) => {
    const {username} = request.body;
    const history = await db.prepare(`
      SELECT * FROM match_history
      WHERE player1_username = ?
      OR player2_username = ?
      ORDER BY created_at DESC;
    `).all(username, username);
    reply.send(JSON.stringify({history: history}));
});

fastify.post("/update_history", async (request, reply) => {
  const {history} = request.body;
  console.log("📩 Requête reçue - History:", history);
  const player1 = history.myusername;
  const player2 = history.otherusername;
  const score_player1 = history.myscore;
  const score_player2 = history.otherscore;
  if (score_player1 != 1 && score_player2 != 1) {
    return;
  }
  let winner;
  let looser;
  if (score_player1 > score_player2) {
    winner = player1;
    looser = player2;
  }
  else {
    looser = player1;
    winner = player2;
  }
  const recentMatch = await db.prepare(`
    SELECT created_at FROM match_history
    WHERE ((player1_username = ? AND player2_username = ?)
        OR (player1_username = ? AND player2_username = ?))
    AND ABS(strftime('%s', 'now') - strftime('%s', created_at)) < 5
    ORDER BY created_at DESC
    LIMIT 1
  `).get(player2, player1, player1, player2);
  if (recentMatch) {
    console.log("match deja enregistrer");
    return ;
  }

  await db.prepare(`INSERT INTO match_history
            (player1_username, player2_username, winner_username, looser_username, player1_score, player2_score)
            VALUES (?, ?, ?, ?, ?, ?)`)
            .run(player1, player2, winner, looser, score_player1, score_player2);
  console.log("Match enregistre");
});

// 🔹 Route POST pour créer un compte
fastify.post("/create_account", async (request, reply) => {
  console.log(`request : ${request.body}`);
  const { username, email, password } = request.body;
  console.log(`password : ${password}`);
  console.log(`email : ${email}`);
  if (!username || !email || !password) {
    console.log("manquant");
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }

  console.log("📩 Requête reçue - Nom:", username, "Email:", email, "Password:", password);

  try {
    // 🔍 Vérifier si l'utilisateur existe déjà
    console.log(`🔍 Recherche de l'utilisateur avec l'email : '${email}'`);
    const existingemail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existingemail) {
      return reply.code(409).send({ success: false });
    }
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(username);
    console.log("🔍 Résultat de la requête SELECT :", existingUser);
    if (existingUser) {
      return reply.code(409).send({ success: false });
    }
    const hashedpasswrd = await bcrypt.hash(password, SALT_ROUNDS);
    // 🔹 Insérer le nouvel utilisateur
    db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(username, email, hashedpasswrd);

    return reply.send({ success: true, message: "Compte créé avec succès !" });

  } catch (error) {
    console.error("❌ Erreur lors de la création du compte :", error.message);
    return reply.code(500).send({ error: "Erreur interne du serveur" });
  }
});
