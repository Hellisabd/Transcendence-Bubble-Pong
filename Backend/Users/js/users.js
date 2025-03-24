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
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar_name TEXT DEFAULT 'default.jpg',
    high_score INTEGER NOT NULL DEFAULT 0
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
    gametype TEXT NOT NULL,
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
    
    gametype TEXT NOT NULL,
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
            player4_username, player4_score, player4_ranking,
            gametype)
            VALUES (?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?)`)
              .run(classement[0].username, classement[0].score, 1, 
                  classement[1].username, classement[1].score, 2,
                  classement[2].username, classement[2].score, 3,
                  classement[3].username, classement[3].score, 4,
                  "pong"
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
      SELECT user_id FROM friends
      WHERE friend_id = ? AND status = 'pending'
      `).all(user_id);
      if (!pending_request)
        return reply.send(JSON.stringify({success: false}));
    console.log("pending in back: ", pending_request);
    let username_invit = []; 
    for (let i = 0; i < pending_request.length; i++) {
      username_invit.push(await get_user_with_id(pending_request[i].user_id));
    }
    return reply.send(JSON.stringify({success: true, user_inviting: username_invit}));
});

async function get_user_with_id(user_id) {
  console.log("user_id in get user with id: ", user_id);
  const user = await db.prepare(`
    SELECT username FROM users
    WHERE id = ?
    `).get(user_id);
    console.log(user.username);
    return user.username;
}

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
    const exisitingFriendship = db.prepare(`
      SELECT * FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(user_sending_id, user_to_add_id, user_to_add_id, user_sending_id);
    if (exisitingFriendship && exisitingFriendship.status != "pending") {
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
          return reply.send(JSON.stringify({success: true, message: "This user already sent u an invitation you are now friends!"}));
      }
      else if (!pending && exisitingFriendship) {
        return reply.send(JSON.stringify({success: false, message: "You already invited this user"}));
      }

    db.prepare(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
      `).run(user_sending_id, user_to_add_id);

    return reply.send(JSON.stringify({succes: true, message: `You successefully invited ${user_to_add}`, user_added: user_to_add}));
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


fastify.post("/settings", async (request, reply) => {
  let old_file_name = null;
  let new_file_name = null;
  const { email, password, newusername, username } = request.body;

  if (!email || !password || !newusername || !username) {
    console.error("Champs manquants :", { email, password, newusername, username });
    return reply.code(400).send({ success: false, error: "Champs manquants" });
  }

  try {
    let filename = await db.prepare("SELECT avatar_name FROM users WHERE username = ?").get(username);
    if (filename && filename.avatar_name !== 'default.jpg') {
      const extension = filename.avatar_name.split('.').pop();
      old_file_name = filename.avatar_name;
      filename = newusername + '.' + extension;
      new_file_name = filename;
    } else {
      filename = filename.avatar_name;
    }

    const newpassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.prepare("UPDATE users SET username = ?, email = ?, password = ?, avatar_name = ? WHERE username = ?")
                            .run(newusername, email, newpassword, filename, username);
    if (result.changes > 0) {
      return reply.send({ success: true , old_file_name: old_file_name, new_file_name: new_file_name});
    } else {
      return reply.send({ success: false });
    }
  } catch (error) {
    return reply.send({ success: false, error: "Erreur interne du serveur" });
  }
});

fastify.get("/me", async (request, reply) => {
  try {
    const token = request.cookies.session;
    if (!token) {
      return reply.send({success: false, error: "Non autorise"});
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return reply.send({ success: true, user : decoded});
  } catch {
    return reply.send({ success: false, error: "Token invalide" });
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

    reply.send(JSON.stringify({history: history, history_tournament: history_tournament}));
  });
  

async function history_for_tournament(history) {
  for (const match of history) { 
    const player1 = match.myusername;
    const player2 = match.otherusername;
    const score_player1 = match.myscore;
    const score_player2 = match.otherscore;
    const gametype = history.gametype;
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
      continue;
    }

    await db.prepare(`INSERT INTO match_history 
              (player1_username, player2_username, winner_username, looser_username, player1_score, player2_score, gametype)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
              .run(player1, player2, winner, looser, score_player1, score_player2, gametype);
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
  const gametype = history.gametype;
  if (score_player1 != 3 && score_player2 != 3) {
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
    return ;
  }

  await db.prepare(`INSERT INTO match_history
            (player1_username, player2_username, winner_username, looser_username, player1_score, player2_score, gametype)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(player1, player2, winner, looser, score_player1, score_player2, gametype);
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

fastify.post("/get_avatar",  async (request, reply) => {
    const {username} = request.body;
    if (!username)
      return reply.send({success: false});
    const avatar_name = await db.prepare(`
      SELECT avatar_name from users
      WHERE username = ?
      `).get(username);
    return reply.send({success: true, avatar_name: avatar_name});
});

fastify.post("/update_avatar",  async (request, reply) => {
  const {avatar_name, username} = request.body;
  if (!avatar_name || !username)
    return reply.send({success: false});
  const result = await db.prepare(`
    UPDATE users SET avatar_name = ?
    WHERE username = ?
    `).run(avatar_name, username);
    if (result.changes > 0)
      return reply.send({success: true, avatar_name: avatar_name});
    return reply.send({success: false});
});

fastify.post("/update_solo_score",  async (request, reply) => {
  try {
    const {username, score} = request.body;
    if (!score || !username)
      return reply.send({success: false});

    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 0) {
      return reply.send({ success: false, message: "Invalid score" });
    }

    const user = await db.prepare("SELECT high_score FROM users WHERE username = ?").get(username);
    if (!user) {
      return reply.send({ success: false, message: "User not found" });
    }

    if (parsedScore > user.high_score) {
      const result = await db.prepare(`
        UPDATE users SET high_score = ? WHERE username = ?
      `).run(parsedScore, username);
      if (result.changes > 0) {
        return reply.send({success: true, new_high_score: parsedScore});
      }
      return reply.send({success: false});
    }
  }
  catch (error) {
    console.error(error);
    return reply.status(500).send({ success: false, message: "Internal server error" });
  }
});