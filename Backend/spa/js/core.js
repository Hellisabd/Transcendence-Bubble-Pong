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

fastify.register(require("@fastify/websocket"));
const { log, create_account , get_user , logout, settings, insert2fa, delete_thing,  waiting_room, update_history, twofaSettings, get_history, end_tournament, add_friend, decline_friend, pending_request, get_stats, get_friends, update_status, Websocket_handling, send_to_friend, display_friends, ping_waiting_room, get_avatar, update_avatar, setup2fa, twofaverify, checkUserExists, get_status } = require("./proxy");
const cors = require("@fastify/cors");
const path = require('path');
const fastifystatic = require('@fastify/static');
const view = require('@fastify/view');
const fs = require('fs');
// const WebSocket = require("ws");
const axios = require("axios"); // Pour faire des requêtes HTTP
const fastifyCookie = require("@fastify/cookie");
const multipart = require('@fastify/multipart');

fastify.register(multipart);

fastify.register(cors, {
  origin: "http://localhost:8000",  // Autorise toutes les origines (*). Pour plus de sécurité, mets l'URL de ton frontend.
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Autorise ces méthodes HTTP
  allowedHeaders: ["Content-Type"],
  preflightContinue: true,
  credential: true
});

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
});
fastify.register(view, {
  engine: { ejs: require("ejs") },
  root: path.join(__dirname, "../../Frontend/templates"),
  includeViewExtension: true,
});


fastify.register(fastifystatic, {
  root: path.join(__dirname, '../../Frontend'),
  prefix: '/Frontend/',
});

fastify.post("/login", log);

fastify.get("/get_user", async (req, reply) => {
    const token = req.cookies.session;
    const username = await get_user(token);
    return reply.send({success: true, username});
})

fastify.get("/logout", async (req, reply) => {
  const token = req.cookies.session;
  const username = await logout(token);
  return reply.clearCookie("session", {
    path: "/",
    httpOnly: true,
    secure: true, // ✅ Doit être `true` en production (HTTPS)
    sameSite: "None"
})
.send({ success: true, message: "Déconnexion réussie" });
})

fastify.register(async function (fastify) {
  fastify.get("/ws/spa/friends", {websocket: true}, (connection, req) => {
    connection.socket.on("message", (message) => {
      const data = JSON.parse(message.toString());
      let username = data.username;
      Websocket_handling(username, connection);
      send_to_friend();
      display_friends(username, connection);
    })
  });
});

fastify.post("/create_account", create_account);

fastify.post("/update_avatar", update_avatar);

fastify.post("/2fa/delete_thing", delete_thing);

fastify.post("/pending_request", pending_request);

fastify.post("/settings", settings);

fastify.post("/update_history", update_history);

fastify.get("/history", get_history);

fastify.get("/get_status", get_status);

fastify.post("/dashboard", get_stats);

fastify.post("/update_status", update_status);

fastify.post("/get_friends", get_friends);

fastify.post("/end_tournament", end_tournament);

fastify.post("/waiting_room", waiting_room);

fastify.post("/ping_waiting_room", ping_waiting_room);

fastify.post("/add_friend", add_friend);

fastify.post("/decline_friend", decline_friend);

fastify.post("/get_avatar", get_avatar);

fastify.post('/2fa/verify', twofaverify);

fastify.post('/2fa/setup', setup2fa);

fastify.post('/2fa/insert', insert2fa);

fastify.get('/2fa/settings', twofaSettings);

fastify.post('/userExists', checkUserExists);

function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  if (input.length > 50) return false; // Empêche les inputs trop longs
  if (!/^[a-zA-Z0-9._@-]+$/.test(input)) return false; // Autorise lettres, chiffres, ., @, _, et -
  return input;
}

fastify.post("/2fa/get_secret", async (request, reply) => {
  const { email } = request.body;

  if (!email || !sanitizeInput(email)) {
      return reply.send({ success: false, error: "Nom d'utilisateur manquant" });
  }

  try {
      const response = await axios.post("http://users:5000/2fa/get_secret",
          { email },
          { headers: { "Content-Type": "application/json" } }
      );

      return reply.send(response.data);
  } catch (error) {
      return reply.send({ success: false, error: "Erreur interne du serveur" });
  }
});

fastify.post("/2fa/get_secret_two", async (request, reply) => {
	const { email } = request.body;

	if (!email || !sanitizeInput(email)) {
		return reply.send({ success: false, error: "Nom d'utilisateur manquant" });
	}

	try {
		const response = await axios.post("http://users:5000/2fa/get_secret_two",
			{ email },
			{ headers: { "Content-Type": "application/json" } }
		);

		return reply.send(response.data);
	} catch (error) {
		return reply.send({ success: false, error: "Erreur interne du serveur" });
	}
  });


fastify.get('/:page', async (request, reply) => {
  const token = request.cookies.session;
  let page = request.params.page
  if (page[page.length - 1] == '/')
    page = page.substring(0, page.length - 1);
  if (page == '' || page == "end_tournament") // siamais on redirige end_tournament ici
    page = 'index'
  let filePath = "Frontend/templates/" + page + ".ejs"
  let fileName =  page + ".ejs"
  if (page.includes('..') || path.isAbsolute(page)) {
    return reply.send('Requête invalide');
  }
  if (!fs.existsSync(filePath)) {
    return reply.send('Page non trouvée');
  }
  return reply.view(fileName);
});

const start = async () => {
    try {
        await fastify.ready();
        await fastify.listen({ port: 7000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};



start();
