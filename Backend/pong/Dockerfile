FROM node:20-bullseye

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN groupadd -g ${GROUP_ID} pong
RUN getent passwd pong || useradd -m -u ${USER_ID} -g pong pong

RUN npm install -g npm@11.1.0

WORKDIR /usr/src/app

COPY ./Backend/pong/config/package*.json ./
COPY ./Backend/pong/js/*.js ./Backend/js/
COPY ./Frontend/templates/* ./Frontend/templates/
RUN npm install
RUN npm install ejs
RUN npm install pino-pretty

USER pong

EXPOSE 4000

CMD ["npm", "start"]