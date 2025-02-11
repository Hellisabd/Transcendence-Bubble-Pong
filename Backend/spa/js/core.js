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

const { log, create_account , me , logout } = require("./proxy");
const cors = require("@fastify/cors");
const path = require('path');
const fastifystatic = require('@fastify/static');
const view = require('@fastify/view');
const fs = require('fs');
console.log(`on est la:::: ${__dirname}`)
const axios = require("axios"); // Pour faire des requêtes HTTP
const fastifyCookie = require("@fastify/cookie");

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

fastify.get("/me", me);

fastify.get("/logout", logout);

fastify.post("/create_account", create_account);

// fastify.listen({ port: 3000, host: "0.0.0.0" }, () => {
//     console.log("🚀 Serveur SPA démarré sur http://0.0.0.0:3000");
// });

fastify.get('/:page', async (request, reply) => {
  let page = request.params.page
  if (page[page.length - 1] == '/')
    page = page.substring(0, page.length - 1)
  console.log(`page::::: ${page}`)
  if (page == '')
    page = 'index'
  let filePath = "Frontend/templates/" + page + ".ejs"
  let fileName =  page + ".ejs"
  console.log(`file path: ${filePath}`)
  if (page.includes('..') || path.isAbsolute(page)) {
    return reply.code(400).send('Requête invalide');
  }
  if (!fs.existsSync(filePath)) {
    return reply.code(404).send('Page non trouvée');
  }
  return reply.view(fileName);
});

const start = async () => {
    try {
        await fastify.ready();
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server running on http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();