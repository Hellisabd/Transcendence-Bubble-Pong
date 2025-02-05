FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} fastify
RUN getent passwd fastify || useradd -m -u ${USER_ID} -g fastify fastify

RUN npm install -g npm@11.1.0

# Créer un répertoire pour l'application
WORKDIR /usr/src/app

# Copier package.json et installer les dépendances
COPY ./Backend/fastify/config/package*.json ./
COPY ./Backend/fastify/js/*.js ./Backend/js/
COPY ./Frontend/templates/* ./Frontend/templates/
RUN npm install
RUN npm install ejs
RUN npm install pino-pretty

RUN mkdir dataBase
RUN touch dataBase/core.db
RUN chown -R fastify:fastify /usr/src/app/dataBase/
RUN chmod -R 777 /usr/src/app/dataBase/core.db

USER fastify

# Exposer le port utilisé par Fastify
EXPOSE 3000

# Lancer l'application
CMD ["npm", "start"]