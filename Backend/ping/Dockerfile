FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} ping
RUN getent passwd ping || useradd -m -u ${USER_ID} -g ping ping

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/ping/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R ping:ping /usr/src/app

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools

COPY ./Backend/ping/config/package*.json ./
COPY ./Backend/ping/js/*.js ./Backend/js/
RUN npm install

USER ping

EXPOSE 4000

CMD ["./entrypoint.sh"]