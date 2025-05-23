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

function sanitizeInput(input) {
    if (typeof input !== "string") return input;
    if (input.length > 50) return false; // Empêche les inputs trop longs
    if (!/^[a-zA-Z0-9._@-]+$/.test(input)) return false; // Autorise lettres, chiffres, ., @, _, et -
    return input;
  }

const generateToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '5h' });
};
// 📌 Chargement de la base de données
const dbFile = process.env.DB_FILE || "/usr/src/app/dataBase/core.db";

// 📌 Vérifier et créer le dossier dataBase s'il n'existe pas
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 📌 Initialiser la base SQLite
const db = new Database(dbFile);

// 🔹 Création de la table "users" si elle n'existe pas
db.prepare(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		avatar_name TEXT DEFAULT 'default.jpg',
		secret TEXT UNIQUE DEFAULT NULL,
    high_score INTEGER NOT NULL DEFAULT 0)
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
    bounce INTEGER DEFAULT 0,
    player1_bonus_paddles_goal_scored DEFAULT 0,
    player1_bonus_paddles_goal_taken DEFAULT 0,
    player1_bonus_shield_goal_scored DEFAULT 0,
    player1_bonus_shield_goal_taken DEFAULT 0,
    player1_bonus_goal_goal_scored DEFAULT 0,
    player1_bonus_goal_goal_taken DEFAULT 0,
    player2_bonus_paddles_goal_scored DEFAULT 0,
    player2_bonus_paddles_goal_taken DEFAULT 0,
    player2_bonus_shield_goal_scored DEFAULT 0,
    player2_bonus_shield_goal_taken DEFAULT 0,
    player2_bonus_goal_goal_scored DEFAULT 0,
    player2_bonus_goal_goal_taken DEFAULT 0,
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
  const {classement, gametype} = request.body;
  if (!sanitizeInput(classement) || !sanitizeInput(gametype))
    return ;
  let rank1 = 1;
  let rank2 = 2;
  let rank3 = 3;
  let rank4 = 4;
  if (classement[0].score == classement[1].score) {
    rank2 = rank1;
  }
  if (classement[1].score == classement[2].score) {
    rank3 = rank2;
  }
  if (classement[2].score == classement[3].score) {
    rank4 = rank3;
  }

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
              .run(classement[0].username, classement[0].score, rank1,
                  classement[1].username, classement[1].score, rank2,
                  classement[2].username, classement[2].score, rank3,
                  classement[3].username, classement[3].score, rank4,
                  gametype
              );
});
 

fastify.post("/pending_request", async (request, reply) => {
    const {username} = request.body;
    if (!sanitizeInput(username))
      return reply.send(JSON.stringify({success: false}));
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
    let username_invit = [];
    for (let i = 0; i < pending_request.length; i++) {
      username_invit.push(await get_user_with_id(pending_request[i].user_id));
    }
    return reply.send(JSON.stringify({success: true, user_inviting: username_invit}));
});

async function get_user_with_id(user_id) {
  const user = await db.prepare(`
    SELECT username FROM users
    WHERE id = ?
    `).get(user_id);
    return user.username;
}

fastify.post("/remove_secret", async (request, reply) => {
  const {username} = request.body;
  db.prepare(`
    UPDATE users
    SET secret = ?
    WHERE username = ?
    `).run(null, username)
});

fastify.post("/get_friends", async (request, reply) => {
  const {username} = request.body;
  if (!sanitizeInput(username))
    return reply.send(JSON.stringify({success: false}));
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

    return reply.send(JSON.stringify({success: true, friends: friends}));
});

fastify.post("/add_friend", async (request, reply) => {
  const {user_sending, user_to_add} = request.body;
  if (!sanitizeInput(user_sending) || !sanitizeInput(user_to_add))
    return reply.send(JSON.stringify({success: false, message: "can't find you in database"}));
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
          return reply.send(JSON.stringify({success: true, display: true, message: "This user already sent you an invitation you are now friends!", user_added: user_to_add}));
      }
      else if (!pending && exisitingFriendship) {
        return reply.send(JSON.stringify({success: false, message: "You already invited this user", user_added: user_to_add}));
      }

    db.prepare(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
      `).run(user_sending_id, user_to_add_id);

    return reply.send(JSON.stringify({success: true, message: `You successefully invited ${user_to_add}`, user_added: user_to_add}));
});

fastify.post("/decline_friend", async (request, reply) => {
	const { user_sending, user_to_decline } = request.body;
  if (!sanitizeInput(user_sending) || !sanitizeInput(user_to_decline))
    	return reply.send({ success: false, message: "Serveur Error" });
	try {
		const user_sending_row = await db.prepare(`
			SELECT id FROM users WHERE username = ?
		`).get(user_sending);
		const user_to_decline_row = await db.prepare(`
			SELECT id FROM users WHERE username = ?
		`).get(user_to_decline);

		if (!user_sending_row) {
			return reply.send({ success: false, message: "Can't find you in database" });
		}
		if (!user_to_decline_row) {
			return reply.send({ success: false, message: "This username does not exist" });
		}

		const user_sending_id = user_sending_row.id;
		const user_to_decline_id = user_to_decline_row.id;

		const pending = db.prepare(`
			SELECT * FROM friends
			WHERE (user_id = ? AND friend_id = ?) OR (friend_id = ? AND user_id = ?)
		`).get(user_to_decline_id, user_sending_id, user_to_decline_id, user_sending_id);

		if (!pending) {
			return reply.send({ success: true, message: "There is no invitation from this user!" });
		}

		try {
			const result = db.prepare(`
				DELETE FROM friends
				WHERE (user_id = ? AND friend_id = ?) OR (friend_id = ? AND user_id = ?);
			`).run(user_sending_id, user_to_decline_id, user_sending_id, user_to_decline_id);

			if (result.changes === 0) {
				return reply.send({ success: false, message: "Aucune entrée supprimée, possible problème." });
			}

			return reply.send({ success: true, message: `You successfully declined ${user_to_decline}`, user_decline: user_to_decline });

		} catch (dbError) {
			return reply.send({ success: false, message: "Erreur lors de la suppression en base." });
		}

	} catch (error) {
		  return reply.send({ success: false, message: "Serveur Error" });
	}
});

// 🔍 Vérifier les tables existantes
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();

// 🚀 Lancement du serveur
fastify.listen({ port: 5000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    process.exit(1);
  }
});

// 🔹 Route POST pour le login
fastify.post("/login", async (request, reply) => {
  const { email, password , domain} = request.body;
  if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(domain)) {
    return reply.send({ success: false, error: "Champs manquants" });
  }
  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user)
        return reply.send({ success: false, error: "Connexion Failed : invalid email" });
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return reply.send({ success: false, error: "Connexion Failed : Incorrect passsword" });
    const token = generateToken(user);
    return reply.send({ success: true, token, username: user.username, "domain": domain });
  } catch (error) {
    return reply.send({ success: false, error: "Internal servor error" });
  }
});


fastify.post("/insert_secret", async (request, reply) => {
  const {email, secretKey} = request.body;
  db.prepare(`
    UPDATE users
    SET secret = ?
    WHERE email = ?
    `).run(secretKey, email);
});


fastify.post("/get_email", async (request, reply) => { 
  const {username} = request.body
  const user = await db.prepare(`
  SELECT email FROM users
  WHERE username = ?
  `).get(username);
  const secret = await db.prepare(`
  SELECT secret FROM users
  WHERE username = ?
  `).get(username);
  let status;
  if (secret && secret.secret)
    status = true;
  else
    status = false;
  data = {email: user.email, fa: status}
  return data;
});

fastify.post("/settings", async (request, reply) => {
  let old_file_name = null;
  let new_file_name = null;
  const { email, password, newusername, username } = request.body;

  if (!sanitizeInput(email) || !sanitizeInput(password) || !sanitizeInput(newusername) || !sanitizeInput(username)) {
    return reply.send({ success: false, error: "Champs manquants" });
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
  if (!sanitizeInput(username))
    return   reply.send(JSON.stringify({success: false}));
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
    const stats = await get_stats(history, history_tournament, username);
    reply.send(JSON.stringify({history: history, history_tournament: history_tournament, stats: stats}));
  });


function calc_winrate_against_friends(friends, username, history, tri) {
  let winrate_per_friend = [];
  let winrate_per_friend_pong = [];
  let winrate_per_friend_ping = [];
  for (let i = 0; i < friends.length; i++) {
    let win_against_friend = 0;
    let loose_against_friend = 0;
    let win_against_friend_pong = 0;
    let loose_against_friend_pong = 0;
    let win_against_friend_ping = 0;
    let loose_against_friend_ping = 0;
    history.forEach(match => {
      if (friends[i].username === match.player1_username || friends[i].username === match.player2_username) {
        if (match.winner_username === username) {
          if (match.gametype == "pong")
            win_against_friend_pong++;
          else
            win_against_friend_ping++;
          win_against_friend++
        }
        else {
          if (match.gametype == "pong")
            loose_against_friend_pong++;
          else
            loose_against_friend_ping++;
          loose_against_friend++;
        }
      }
    });
    winrate_per_friend.push({username: friends[i].username, winrate: win_against_friend / (win_against_friend + loose_against_friend) * 100 || 0});
    winrate_per_friend_pong.push({username: friends[i].username, winrate: win_against_friend_pong / (win_against_friend_pong + loose_against_friend_pong) * 100 || 0});
    winrate_per_friend_ping.push({username: friends[i].username, winrate: win_against_friend_ping / (win_against_friend_ping + loose_against_friend_ping) * 100 || 0});
  }
  if (!tri)
    return winrate_per_friend;
  else if (tri == 1)
    return winrate_per_friend_pong;
  return winrate_per_friend_ping
}

async function get_stats(history, history_tournament, username) {
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
  const topPlayers = await db.prepare(`
    SELECT username, high_score
    FROM users
    ORDER BY high_score DESC
    LIMIT 5
  `).all();
  const my_high_score = await db.prepare(`
    SELECT high_score FROM users
    WHERE username = ?
  `).get(username);

  let win = 0;
  let loose = 0;
  let win_pong = 0;
  let loose_pong = 0;
  let win_ping = 0;
  let loose_ping = 0;
  let bounce = [];
  let goal_after_bonus_paddle = 0;
  let goal_taken_after_bonus_paddle = 0;
  let goal_after_bonus_goal = 0;
  let goal_taken_after_bonus_goal = 0;
  let goal_after_bonus_shield = 0;
  let goal_taken_after_bonus_shield = 0;
  history.forEach(match => {
    if (match.player1_username === username) {
      goal_after_bonus_paddle += match.player1_bonus_paddles_goal_scored;
      goal_taken_after_bonus_paddle += match.player1_bonus_paddles_goal_taken;
      goal_after_bonus_goal += match.player1_bonus_goal_goal_scored;
      goal_taken_after_bonus_goal += match.player1_bonus_goal_goal_taken;
      goal_after_bonus_shield += match.player1_bonus_shield_goal_scored;
      goal_taken_after_bonus_shield += match.player1_bonus_shield_goal_taken;
    }
    else if (match.player2_username === username) {
      goal_after_bonus_paddle += match.player2_bonus_paddles_goal_scored;
      goal_taken_after_bonus_paddle += match.player2_bonus_paddles_goal_taken;
      goal_after_bonus_goal += match.player2_bonus_goal_goal_scored;
      goal_taken_after_bonus_goal += match.player2_bonus_goal_goal_taken;
      goal_after_bonus_shield += match.player2_bonus_shield_goal_scored;
      goal_taken_after_bonus_shield += match.player2_bonus_shield_goal_taken;
    }
    if (match.winner_username === username) {
      if (match.gametype == "pong")
        win_pong++;
      else
        win_ping++;
      win++
    }
    else {
      if (match.gametype == "pong")
        loose_pong++;
      else
        loose_ping++;
      loose++;
    }
    if (match.gametype == "ping")
      bounce.push(match.bounce);
  });

  let place_in_tournament = [];
  let score_in_tournament = [];
  let place_in_tournament_pong = [];
  let score_in_tournament_pong = [];
  let place_in_tournament_ping = [];
  let score_in_tournament_ping = [];
  let nbr_of_tournament_won = 0;
  let nbr_of_tournament_won_pong = 0;
  let nbr_of_tournament_won_ping = 0;
  history_tournament.forEach(classement => {
      for (let i = 1; i < 5; i++) {
        const usernameKey = `player${i}_username`;
        const scoreKey = `player${i}_score`;
        const rankingKey = `player${i}_ranking`;
        if (classement[usernameKey] === username) {
          if (classement[rankingKey] === 1) {
            nbr_of_tournament_won++;
            if (classement.gametype === "pong") {
              nbr_of_tournament_won_pong++;
            }
            else {
              nbr_of_tournament_won_ping++;
            }
          }
          place_in_tournament.push(classement[rankingKey]);
          score_in_tournament.push(classement[scoreKey]);
          if (classement.gametype === "pong") {
            place_in_tournament_pong.push(classement[rankingKey]);
            score_in_tournament_pong.push(classement[scoreKey]);
          }
          else {
            place_in_tournament_ping.push(classement[rankingKey]);
            score_in_tournament_ping.push(classement[scoreKey]);
          }
        }
      }
  });
  let stats = {
    winrate: win / (win + loose) * 100 || 0,
    winrate_ping: win_ping / (win_ping + loose_ping) * 100 || 0,
    winrate_pong: win_pong / (win_pong + loose_pong) * 100 || 0,
    average_bounce_per_game: calc_average(bounce) || 0,
    goal_after_bonus_paddle: goal_after_bonus_paddle / (goal_after_bonus_paddle + goal_taken_after_bonus_paddle) * 100 || 0,
    goal_after_bonus_goal: goal_after_bonus_goal / (goal_after_bonus_goal + goal_taken_after_bonus_goal) * 100 || 0,
    goal_after_bonus_shield: goal_after_bonus_shield / (goal_after_bonus_shield + goal_taken_after_bonus_shield) * 100 || 0,
    winrate_against_friends: calc_winrate_against_friends(friends, username, history, 0) || 0,
    winrate_against_friends_pong: calc_winrate_against_friends(friends, username, history, 1) || 0,
    winrate_against_friends_ping: calc_winrate_against_friends(friends, username, history, 2) || 0,
    average_place_in_tournament: calc_average(place_in_tournament) || 0,
    average_score_in_tournament: calc_average(score_in_tournament) || 0,
    average_place_in_tournament_pong: calc_average(place_in_tournament_pong) || 0,
    average_score_in_tournament_pong: calc_average(score_in_tournament_pong) || 0,
    average_place_in_tournament_ping: calc_average(place_in_tournament_ping) || 0,
    average_score_in_tournament_ping: calc_average(score_in_tournament_ping) || 0,
    nbr_of_tournament_won: nbr_of_tournament_won || 0,
    nbr_of_tournament_won_pong: nbr_of_tournament_won_pong || 0,
    nbr_of_tournament_won_ping: nbr_of_tournament_won_ping || 0,
    topPlayers: topPlayers || 0,
    my_high_score: my_high_score || 0,
  }
  return stats;
}

function calc_average(tab) {
  let sum_of_element = 0;
  for (let i = 0; i < tab.length; i++) {
    sum_of_element += tab[i];
  }
  return sum_of_element / tab.length;
}

async function history_for_tournament(history, gametype) {
  for (const match of history) {
    const player1 = match.myusername;
    const player2 = match.otherusername;
    const score_player1 = match.myscore;
    const score_player2 = match.otherscore;
    const bounce = match.bounce;
    const bonus_stat = extract_bonus_data(match.bonus_stats, player1, player2);
    if (score_player1 !== 3 && score_player2 !== 3) {
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
      (player1_username,
      player2_username,
      winner_username,
      looser_username,
      player1_score,
      player2_score,
      gametype,
      bounce,
      player1_bonus_paddles_goal_scored,
      player1_bonus_paddles_goal_taken,
      player1_bonus_shield_goal_scored,
      player1_bonus_shield_goal_taken,
      player1_bonus_goal_goal_scored,
      player1_bonus_goal_goal_taken,
      player2_bonus_paddles_goal_scored,
      player2_bonus_paddles_goal_taken,
      player2_bonus_shield_goal_scored,
      player2_bonus_shield_goal_taken,
      player2_bonus_goal_goal_scored,
      player2_bonus_goal_goal_taken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(player1,
          player2,
          winner,
          looser,
          score_player1,
          score_player2,
          gametype,
          bounce,
          bonus_stat.player1_bonus_paddles_goal_scored,
          bonus_stat.player1_bonus_paddles_goal_taken,
          bonus_stat.player1_bonus_shield_goal_scored,
          bonus_stat.player1_bonus_shield_goal_taken,
          bonus_stat.player1_bonus_goal_goal_scored,
          bonus_stat.player1_bonus_goal_goal_taken,
          bonus_stat.player2_bonus_paddles_goal_scored,
          bonus_stat.player2_bonus_paddles_goal_taken,
          bonus_stat.player2_bonus_shield_goal_scored,
          bonus_stat.player2_bonus_shield_goal_taken,
          bonus_stat.player2_bonus_goal_goal_scored,
          bonus_stat.player2_bonus_goal_goal_taken
        );
  }
}

function extract_bonus_data(bonus_stats, player1, player2) {
  let tab = {
    player1_bonus_paddles_goal_scored : 0,
    player1_bonus_paddles_goal_taken : 0,
    player1_bonus_shield_goal_scored : 0,
    player1_bonus_shield_goal_taken : 0,
    player1_bonus_goal_goal_scored : 0,
    player1_bonus_goal_goal_taken : 0,
    player2_bonus_paddles_goal_scored : 0,
    player2_bonus_paddles_goal_taken : 0,
    player2_bonus_shield_goal_scored : 0,
    player2_bonus_shield_goal_taken : 0,
    player2_bonus_goal_goal_scored : 0,
    player2_bonus_goal_goal_taken : 0
  }
  if (!bonus_stats)
    return tab;
  for (let i = 0; i < bonus_stats.length; i++) {
    if (bonus_stats[i].player_who_scored == player1) {
      if (bonus_stats[i].bonus_name == "paddles") {
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_paddles_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_paddles_goal_taken++;
        }
      }
      if (bonus_stats[i].bonus_name == "shield") {
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_shield_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_shield_goal_taken++;
        }
      }
      if (bonus_stats[i].bonus_name == "goal") {
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_goal_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_goal_goal_taken++;
        }
      }
    }
    if (bonus_stats[i].player_who_scored == player2) {
      if (bonus_stats[i].bonus_name == "paddles") {
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_paddles_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_paddles_goal_taken++;
        }
      }
      if (bonus_stats[i].bonus_name == "shield") {
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_shield_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_shield_goal_taken++;
        }
      }
      if (bonus_stats[i].bonus_name == "goal") {
        if (bonus_stats[i].player_with_bonus == player2) {
          tab.player2_bonus_goal_goal_scored++;
        }
        if (bonus_stats[i].player_with_bonus == player1) {
          tab.player1_bonus_goal_goal_taken++;
        }
      }
    }
  }
  return tab;
}

fastify.post("/update_history", async (request, reply) => {
  const {history, tournament, gametype} = request.body;
  if (!sanitizeInput(history) || !sanitizeInput(tournament) || !sanitizeInput(gametype))
		return reply.send({ success: false, message: "Serveur Error" });
  if (tournament) {
    history_for_tournament(history, gametype);
    return ;
  }
  const player1 = history.myusername;
  const player2 = history.otherusername;
  const bonus_stat = extract_bonus_data(history.bonus_stats, player1, player2);

  const score_player1 = history.myscore;
  const score_player2 = history.otherscore;
  const gametypesologame = history.gametype;
  const bounce = history.bounce ?? 0;
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
            (player1_username,
            player2_username,
            winner_username,
            looser_username,
            player1_score,
            player2_score,
            gametype,
            bounce,
            player1_bonus_paddles_goal_scored,
            player1_bonus_paddles_goal_taken,
            player1_bonus_shield_goal_scored,
            player1_bonus_shield_goal_taken,
            player1_bonus_goal_goal_scored,
            player1_bonus_goal_goal_taken,
            player2_bonus_paddles_goal_scored,
            player2_bonus_paddles_goal_taken,
            player2_bonus_shield_goal_scored,
            player2_bonus_shield_goal_taken,
            player2_bonus_goal_goal_scored,
            player2_bonus_goal_goal_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(player1,
                player2,
                winner,
                looser,
                score_player1,
                score_player2,
                gametypesologame,
                bounce,
                bonus_stat.player1_bonus_paddles_goal_scored,
                bonus_stat.player1_bonus_paddles_goal_taken,
                bonus_stat.player1_bonus_shield_goal_scored,
                bonus_stat.player1_bonus_shield_goal_taken,
                bonus_stat.player1_bonus_goal_goal_scored,
                bonus_stat.player1_bonus_goal_goal_taken,
                bonus_stat.player2_bonus_paddles_goal_scored,
                bonus_stat.player2_bonus_paddles_goal_taken,
                bonus_stat.player2_bonus_shield_goal_scored,
                bonus_stat.player2_bonus_shield_goal_taken,
                bonus_stat.player2_bonus_goal_goal_scored,
                bonus_stat.player2_bonus_goal_goal_taken
              );
});
// 🔹 Route POST pour créer un compte
fastify.post("/create_account", async (request, reply) => {
  const { username, email, password, secretKey } = request.body;
  if (!sanitizeInput(username) || !sanitizeInput(email) || !sanitizeInput(password) || username == "default") {
    return reply.send({ success: false, error: "Champs manquants" });
  }

  try {
    // 🔍 Vérifier si l'utilisateur existe déjà
    const existingemail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existingemail) {
      return reply.send({ success: false });
    }
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(username);
    if (existingUser) {
      return reply.send({ success: false });
    }
    const hashedpasswrd = await bcrypt.hash(password, SALT_ROUNDS);

	// 🔹 Insérer le nouvel utilisateur
	if (secretKey)
		db.prepare("INSERT INTO users (username, email, password, secret) VALUES (?, ?, ?, ?)").run(username, email, hashedpasswrd, secretKey);
	else
		db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(username, email, hashedpasswrd);


    return reply.send({ success: true, message: "Compte créé avec succès !" });

  } catch (error) {
    return reply.send({ error: "Erreur interne du serveur" });
  }
});

fastify.post("/userExists", async (request, reply) => {
	const { username } = request.body;
  if (!sanitizeInput(username))
		return reply.send({ success: false, message: "Serveur Error" });
	try {
		const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
		if (row) {
			reply.send({ success: true, user: row });
		} else {
			reply.send({ success: false, message: "User.js : Utilisateur non trouvé" });
		}
	} catch (err) {
		reply.send({ success: false, message: "Erreur serveur" });
	}
});

fastify.post("/get_avatar",  async (request, reply) => {
    const {username} = request.body;
    if (!sanitizeInput(username))
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

fastify.post("/2fa/get_secret", async (request, reply) => {
  const { email } = request.body;

  if (!sanitizeInput(email)) {
      return reply.send({ success: false, error: "Nom d'utilisateur manquant" });
  }

  try {
      const user = await db.prepare("SELECT secret FROM users WHERE email = ?").get(email);
      if (!user || !user.secret) {
          return reply.send({ success: false, error: "Secret non trouvé" });
      }
      return reply.send({ success: true, secret: user.secret });
  } catch (error) {
      return reply.send({ success: false, error: "Erreur interne du serveur" });
  }
});

fastify.post("/2fa/get_secret_two", async (request, reply) => {
	const { email } = request.body;

	if (!sanitizeInput(email)) {
		return reply.send({ success: false, error: "Nom d'utilisateur manquant" });
	}

	try {
		const user = await db.prepare("SELECT secret FROM users WHERE email = ?").get(email);
		if (!user || !user.secret) {
			return reply.send({ success: false });
		}
		return reply.send({ success: true });
	} catch (error) {
		return reply.send({ success: false, error: "Erreur interne du serveur" });
	}
  });

fastify.post("/update_solo_score",  async (request, reply) => {
  try {
    const {username, score} = request.body;
    if (!sanitizeInput(score) || !sanitizeInput(username))
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
    return reply.send({success: true});
  }
  catch (error) {
    return reply.send({ success: false, message: "Internal server error" });
  }
});
