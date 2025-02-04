const fastify = require('fastify')({ logger: true });
const path = require('path');
const fastifystatic = require('fastify-static');

const fs = require('fs');

fastify.register(fastifystatic, {root: path.join(__dirname, '../../Frontend'), prefix: '/Frontend/', })

fastify.get('/:page', async (request, reply) => {
  let page = request.params.page
  console.log(`page::::: ${page}`)
  if (page == '')
    page = 'index'
  let filePath = "Frontend/templates/" + page + ".html"
  let filName =  page + ".html"
  console.log(`file path: ${filePath}`)
  if (page.includes('..') || path.isAbsolute(page)) {
    return reply.code(400).send('Requête invalide');
  }
  if (!fs.existsSync(filePath)) {
    return reply.code(404).send('Page non trouvée');
  }
  return reply.sendFile(filName, 'Frontend/templates/');
});



const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server running on http://localhost:3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();