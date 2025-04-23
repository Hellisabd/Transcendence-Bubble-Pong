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
RUN npm install formidable
RUN npm install @fastify/multipart
RUN npm install @fastify/cookie
RUN npm install -g tailwindcss@^3.3.0
RUN npm install tailwindcss@^3.3.0
RUN npm install sweetalert2

RUN apt install -y nodejs npm
RUN npm install @noble/hashes
RUN npm install --unsafe-perm qrcode
RUN npm install --unsafe-perm otplib

# Exposer le port utilisé par spa
EXPOSE 7000

# Lancer l'application
CMD ["./entrypoint.sh"]

# USER spa
