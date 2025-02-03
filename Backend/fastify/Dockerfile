FROM node:18-bullseye

ARG USER_ID=1001
ARG GROUP_ID=1001
RUN groupadd -g ${GROUP_ID} fastify && \
    useradd -m -u ${USER_ID} -g fastify fastify

# Créer un répertoire pour l'application
WORKDIR /usr/src/app

# Copier package.json et installer les dépendances
COPY ./Backend/fastify/config/package*.json ./
COPY ./Backend/fastify/js/*.js ./Backend/js/
COPY ./Frontend/templates/* ./Frontend/templates/
RUN npm install

USER fastify

# Exposer le port utilisé par Fastify
EXPOSE 3000

# Lancer l'application
CMD ["npm", "start"]