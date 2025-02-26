FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} game2
RUN getent passwd game2 || useradd -m -u ${USER_ID} -g game2 game2

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/game2/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R game2:game2 /usr/src/app

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools

COPY ./Backend/game2/config/package*.json ./
COPY ./Backend/game2/js/*.js ./Backend/js/
RUN npm install

USER game2

EXPOSE 4000

CMD ["./entrypoint.sh"]