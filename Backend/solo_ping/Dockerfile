FROM node:20-bullseye-slim

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} soloping
RUN getent passwd soloping || useradd -m -u ${USER_ID} -g soloping soloping

WORKDIR /usr/src/app
RUN apt-get update
RUN apt install -y inotify-tools
COPY ./Backend/solo_ping/config/entrypoint.sh ./
RUN chmod +x entrypoint.sh
RUN chown -R soloping:soloping /usr/src/app

RUN npm install -g npm@11.1.0
RUN npm install -g wscat
RUN apt-get update && apt-get install -y net-tools
RUN apt-get update && apt-get install -y procps

COPY ./Backend/solo_ping/config/package*.json ./
COPY ./Backend/solo_ping/js/*.js ./Backend/js/
RUN npm install

USER soloping

CMD ["./entrypoint.sh"]