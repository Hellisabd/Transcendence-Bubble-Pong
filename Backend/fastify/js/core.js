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
const path = require('path');
const fastifystatic = require('@fastify/static');
const view = require('@fastify/view');
const fs = require('fs');
const fastifySqlite = require('fastify-sqlite');
const WebSocket = require("ws");

let pongSocket = new WebSocket("ws://pong:4000/ws/pong");
pongSocket.on("open", () => { console.log("✅ Connecté au serveur WebSocket de Pong !")});


// let pongSocket;
// let retries = 0;

// function connectToPong() {
//     if (retries >= 5) {
//         console.error("❌ Impossible de se connecter à Pong après plusieurs tentatives.");
//         return;
//     }

//     console.log(`🔄 Tentative de connexion à Pong (${retries + 1}/5)...`);

//     pongSocket = new WebSocket(PONG_WS_URL);

//     pongSocket.on("open", () => {
//         console.log("✅ Connecté au serveur WebSocket de Pong !");
//         retries = 0; // Reset des tentatives en cas de succès
//     });

//     pongSocket.on("error", (err) => {
//         console.error("⚠️ Erreur de connexion à Pong:", err.message);
//         retries++;
//         setTimeout(connectToPong, 2000); // Réessayer après 2 secondes
//     });

//     pongSocket.on("close", () => {
//         console.warn("🔌 Connexion WebSocket fermée, tentative de reconnexion...");
//         setTimeout(connectToPong, 2000);
//     });
// }

// connectToPong();

fastify.get("/game/status", async (request, reply) => {
  return new Promise((resolve) => {
      pongSocket.once("message", (message) => {
          const data = JSON.parse(message);
          if (data.type === "state") {
              resolve(data.data);
          }
      });
  });
});

fastify.post("/game/move", async (request, reply) => {
  const { player, move } = request.body;
  pongSocket.send(JSON.stringify({ type: "move", player, move }));
  return { success: true };
});

fastify.register(view, {
  engine: { ejs: require("ejs") },
  root: path.join(__dirname, "../../Frontend/templates"),
  includeViewExtension: true,
});

const dbFile = process.env.DB_FILE

fastify.register(fastifySqlite, {
  dbFile: dbFile,
});

fastify.register(fastifystatic, {
  root: path.join(__dirname, '../../Frontend'), 
  prefix: '/Frontend/', 
});

fastify.get('/:page', async (request, reply) => {
  let page = request.params.page
  if (page[page.length - 1] == '/')
    page = page.substring(0, page.length - 1)
  if (page == '')
    page = 'index'
  let filePath = "Frontend/templates/" + page + ".ejs"
  let filName =  page + ".ejs"
  if (page.includes('..') || path.isAbsolute(page)) {
    return reply.code(400).send('Requête invalide');
  }
  if (!fs.existsSync(filePath)) {
    return reply.code(404).send('Page non trouvée');
  }
  return reply.view(filName);
});

fastify.ready().then(async () => {
  const db = fastify.sqlite;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);
});

const start = async () => {
    try {
        await fastify.ready();
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();