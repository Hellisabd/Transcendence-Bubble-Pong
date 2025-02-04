const fastify = require('fastify')({ logger: true });
const path = require('path');
const fastifystatic = require('fastify-static');

fastify.register(fastifystatic, {root: path.join(__dirname, '../../Frontend/templates'), prefix: '/', })

fastify.get('/', async (request, reply) => {
    return reply.sendFile('bonjour_monsieur.html');
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