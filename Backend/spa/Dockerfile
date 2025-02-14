FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} spa
RUN getent passwd spa || useradd -m -u ${USER_ID} -g spa spa

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools
RUN apt install -y inotify-tools

# Créer un répertoire pour l'application
WORKDIR /usr/src/app


# Copier package.json et installer les dépendances
COPY ./Backend/spa/config/*.json ./
COPY ./Backend/spa/js/*.js ./Backend/js/
COPY ./Frontend ./Frontend
COPY ./Backend/spa/config/entrypoint.sh ./

RUN chmod +x entrypoint.sh
RUN chown -R spa:spa /usr/src/app

RUN npm install
RUN npm install ejs
RUN npm install -g typescript
RUN npm install pino-pretty
RUN npm install @fastify/cookie

USER spa

# Exposer le port utilisé par spa
EXPOSE 3000

# Lancer l'application
CMD ["./entrypoint.sh"]