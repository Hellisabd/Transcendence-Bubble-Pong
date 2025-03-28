FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} Users
RUN getent passwd Users || useradd -m -u ${USER_ID} -g Users Users

RUN npm install -g npm@11.1.0

# Créer un répertoire pour l'application
WORKDIR /usr/src/app

RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/Users/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R Users:Users /usr/src/app

# Copier package.json et installer les dépendances
COPY Backend/Users/config/package.json ./
COPY ./Backend/Users ./
RUN npm install
RUN npm install pino-pretty bcrypt
RUN npm install @fastify/cookie
RUN npm install formidable
RUN npm install -g typescript
RUN apt-get update && apt-get install -y sqlite3


RUN mkdir -p dataBase
# RUN touch dataBase/core.db
RUN chown -R Users:Users /usr/src/app/dataBase/
# RUN chmod -R 777 /usr/src/app/dataBase/core.db

USER Users

# Exposer le port utilisé par Users
EXPOSE 5000

# Lancer l'application
CMD ["./entrypoint.sh"]
