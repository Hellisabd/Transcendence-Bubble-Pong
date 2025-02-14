FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} pong
RUN getent passwd pong || useradd -m -u ${USER_ID} -g pong pong

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/pong/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R pong:pong /usr/src/app

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools

COPY ./Backend/pong/config/package*.json ./
COPY ./Backend/pong/js/*.js ./Backend/js/
RUN npm install

USER pong

EXPOSE 4000

CMD ["./entrypoint.sh"]