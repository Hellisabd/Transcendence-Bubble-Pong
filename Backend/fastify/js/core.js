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
const fastifystatic = require('fastify-static');
const pointOfView = require("point-of-view");
const fs = require('fs');
const fastifySqlite = require('fastify-sqlite')

fastify.register(pointOfView, {
  engine: { ejs: require("ejs") },
  root: path.join(__dirname, "../../Frontend/templates"),
  includeViewExtension: true,
});

fastify.register(fastifySqlite, {
  dbFile: path.join(__dirname, "core.db"),
});

fastify.register(fastifystatic, {
  root: path.join(__dirname, '../../Frontend'), 
  prefix: '/Frontend/', 
});

fastify.get("/data", async (request, reply) => {
  try {
    const rows = await fastify.sqlite.all(dbFile); // Remplace "my_table" par le vrai nom de ta table
    return { success: true, data: rows };
  } catch (err) {
    return reply.code(500).send({ success: false, error: err.message });
  }
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