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

const SALT_ROUNDS = 10;

fastify.register(cors, {
  origin: "http://spa:3000",
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
    username TEXT NOT NULL UNIQUE,
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

db.prepare(`
  CREATE TABLE IF NOT EXISTS tournament_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_username TEXT NOT NULL,
    player1_score INTEGER NOT NULL DEFAULT 0,
    player1_ranking INTEGER NOT NULL DEFAULT 0,

    player2_username TEXT NOT NULL,
    player2_score INTEGER NOT NULL DEFAULT 0,
    player2_ranking INTEGER NOT NULL DEFAULT 0,

    player3_username TEXT NOT NULL,
    player3_score INTEGER NOT NULL DEFAULT 0,
    player3_ranking INTEGER NOT NULL DEFAULT 0,

    player4_username TEXT NOT NULL,
    player4_score INTEGER NOT NULL DEFAULT 0,
    player4_ranking INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `).run();

db.prepare(` 
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
    )
    `).run();
    
fastify.post("/update_history_tournament", async (request, reply) => {
  const {classement} = request.body;
  db.prepare(`INSERT INTO tournament_history 
            (player1_username, player1_score, player1_ranking,
            player2_username, player2_score, player2_ranking,
            player3_username, player3_score, player3_ranking,
            player4_username, player4_score, player4_ranking)
            VALUES (?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?)`)
              .run(classement[0].username, classement[0].score, 1, 
                  classement[1].username, classement[1].score, 2,
                  classement[2].username, classement[2].score, 3,
                  classement[3].username, classement[3].score, 4,
              );
});

fastify.post("/pending_request", async (request, reply) => {
    const {username} = request.body;
    const user_id = await db.prepare(`
      SELECT id FROM users
      WHERE username = ?
      `).get(username)?.id;
    if (!user_id) {
      return reply.send(JSON.stringify({success: false, message: "user not found in db"}));
    }
    const pending_request = await db.prepare(`
      SELECT * FROM friends
      WHERE friend_id = ? AND status = 'pending'
      `).run(user_id);
    console.log(pending_request);
});

fastify.post("/get_friends", async (request, reply) => {
  const {username} = request.body;
  const user = await db.prepare(`
    SELECT id FROM users
    WHERE username = ?
    `).get(username);
  if (!user) {
    return reply.send(JSON.stringify({success: false, message: "user not found in db"}));
  }
  const user_id = user.id;
  let friends = [];
  const friend1 = await db.prepare(`
    SELECT friend_id FROM friends
    WHERE (user_id = ? AND status = 'accepted')
    `).all(user_id);
  const friend2 = await db.prepare(`
    SELECT user_id FROM friends
    WHERE (friend_id = ? AND status = 'accepted')
    `).all(user_id);
  const friendIds = friend1.map(f => f.friend_id).concat(friend2.map(f => f.user_id));
  for (let i = 0; i < friendIds.length; i++) {
    const friendUsername = await db.prepare(`
      SELECT username FROM users
      WHERE id = ?
      `).get(friendIds[i]);
    if (friendUsername) {
      friends.push(friendUsername);
    }
  }
    const databaseContent = await db.prepare(`
        SELECT * FROM friends
        `).all();
      console.log("database friend:::", JSON.stringify(databaseContent));
    return reply.send(JSON.stringify({success: true, friends: friends}));
});

fastify.post("/add_friend", async (request, reply) => {
  const {user_sending, user_to_add} = request.body;
  const user_sending_id = await db.prepare(`
    SELECT id FROM users
    WHERE username = ?
    `).get(user_sending)?.id;
    const user_to_add_id = await db.prepare(`
      SELECT id FROM users
      WHERE username = ?
      `).get(user_to_add)?.id;
    if (!user_sending_id) {
      return reply.send(JSON.stringify({success: false, message: "can't find you in database"}));
    }
    if (!user_to_add_id) {
      return reply.send(JSON.stringify({success: false, message: "This username does not exist"}));
    }
    console.log(`user_sending_id: ${user_sending_id}, user_to_add_id: ${user_to_add_id}`);
    const exisitingFriendship = db.prepare(`
      SELECT * FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(user_sending_id, user_to_add_id, user_to_add_id, user_sending_id);
    if (exisitingFriendship && exisitingFriendship.status != "pending") {
      // const databaseContent = await db.prepare(`
      //   SELECT * FROM friends
      //   `).all();
      // console.log("database friend:::", JSON.stringify(databaseContent));
      return reply.send(JSON.stringify({success: false, message: "You are already friend"}));
    }
    const pending = db.prepare(`
      SELECT * FROM friends
      WHERE (user_id = ? AND friend_id = ?)
      `).get(user_to_add_id, user_sending_id);
      if (pending && pending.status == "pending") {
        db.prepare(`
          UPDATE friends
          SET status = 'accepted'
          WHERE (user_id = ? AND friend_id = ?)
          `).run( user_to_add_id, user_sending_id);
          const databaseContent = await db.prepare(`
            SELECT * FROM friends
            `).all();
          console.log(`database friend::: ${databaseContent}`);
          return reply.send(JSON.stringify({success: true, message: "This user already sent u an invitation you are now friends!"}));
      }
      else if (!pending && exisitingFriendship) {
        return reply.send(JSON.stringify({success: false, message: "You already invited this user"}));
      }

    db.prepare(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
      `).run(user_sending_id, user_to_add_id);

    return reply.send(JSON.stringify({succes: true, message: `You successefully invited ${user_to_add}`}));
});

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
  if (!email || !password || !newusername || !username) {
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }
  try {
    const newpassword = await bcrypt.hash(password, SALT_ROUNDS); 
    const stmt = db.prepare("UPDATE users SET username = ?, email = ?, password = ? WHERE username = ?");
    const result = stmt.run(newusername, email, newpassword, username);
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

    const history_tournament = await db.prepare(`
      SELECT * FROM tournament_history
      WHERE player1_username = ?
      OR player2_username = ?
      OR player3_username = ?
      OR player4_username = ?
      ORDER BY created_at DESC;
      `).all(username, username, username, username);

    console.log("history_tournament: ", history_tournament);
    reply.send(JSON.stringify({history: history, history_tournament: history_tournament}));
  });
  


  async function history_for_tournament(history) {
    for (const match of history) { 
      const player1 = match.myusername;
      const player2 = match.otherusername;
      const score_player1 = match.myscore;
    const score_player2 = match.otherscore;
    
    if (score_player1 !== 1 && score_player2 !== 1) {
      return;
    }

    let winner, looser;
    if (score_player1 > score_player2) {
      winner = player1;
      looser = player2;
    } else {
      looser = player1;
      winner = player2;
    }

    // Vérification des matchs récents dans les 5 dernières secondes
    const recentMatch = await db.prepare(`
      SELECT created_at FROM match_history 
      WHERE ((player1_username = ? AND player2_username = ?) 
          OR (player1_username = ? AND player2_username = ?))
      AND ABS(strftime('%s', 'now') - strftime('%s', created_at)) < 5
      ORDER BY created_at DESC
      LIMIT 1
    `).get(player2, player1, player1, player2);

    if (recentMatch) {
      console.log("Match déjà enregistré");
      continue;
    }

    await db.prepare(`INSERT INTO match_history 
              (player1_username, player2_username, winner_username, looser_username, player1_score, player2_score)
              VALUES (?, ?, ?, ?, ?, ?)`)
              .run(player1, player2, winner, looser, score_player1, score_player2);
  }
}

fastify.post("/update_history", async (request, reply) => {
  const {history, tournament} = request.body;
  if (tournament) {
    history_for_tournament(history);
    return ;
  }
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
  const { username, email, password } = request.body;
  if (!username || !email || !password) {
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }

  try {
    // 🔍 Vérifier si l'utilisateur existe déjà
    const existingemail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existingemail) {
      return reply.code(409).send({ success: false });
    }
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(username);
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