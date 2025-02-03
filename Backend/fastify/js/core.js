const fastify = require('fastify')({ logger: true })
const path = require('path')
const fastifyStatic = require('fastify-static')

const fs = require('fs');

// Vérifie si le répertoire existe avant d'essayer de l'utiliser
const templatesPath = "/usr/src/app/Frontend/templates";

fastify.register(fastifyStatic, {
  root: templatesPath, // Répertoire des templates
  prefix: '/templates/',  // Le chemin de base pour accéder aux fichiers
})

fastify.get('/:page?', async (request, reply) => {
  return reply.sendFile('index.html')
})

fastify.listen(3000, '0.0.0.0', err => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`Server listening at http://0.0.0.0:3000`)
})