FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} Matchmaking
RUN getent passwd Matchmaking || useradd -m -u ${USER_ID} -g Matchmaking Matchmaking

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/Matchmaking/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R Matchmaking:Matchmaking /usr/src/app

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools

COPY ./Backend/Matchmaking/config/package*.json ./
COPY ./Backend/Matchmaking/js/*.js ./Backend/js/
RUN npm install

USER Matchmaking

EXPOSE 4020

CMD ["./entrypoint.sh"]