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
const fastifySqlite = require('fastify-sqlite')

console.log(`on est la:::: ${__dirname}`)

fastify.register(view, {
  engine: { ejs: require("ejs") },
  root: path.join(__dirname, "../../Frontend/templates"),
  includeViewExtension: true,
});

const dbFile = process.env.DB_FILE

fastify.register(fastifySqlite, {
  dbFile: dbFile,
});

console.log(`dbFile :::::: ${dbFile}`)

fastify.register(fastifystatic, {
  root: path.join(__dirname, '../../Frontend'), 
  prefix: '/Frontend/', 
});

fastify.get('/:page', async (request, reply) => {
  let page = request.params.page
  if (page[page.length - 1] == '/')
    page = page.substring(0, page.length - 1)
  console.log(`page::::: ${page}`)
  if (page == '')
    page = 'index'
  let filePath = "Frontend/templates/" + page + ".ejs"
  let filName =  page + ".ejs"
  console.log(`file path: ${filePath}`)
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

  console.log("✅ Table 'users' créée/vérifiée !");
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