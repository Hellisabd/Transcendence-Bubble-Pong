FROM nginx:latest

COPY ./Backend/nginx/config/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY ./Backend/nginx/config/conf.d/nginx.conf /etc/nginx/nginx.conf
COPY ./Frontend usr/src/app/

RUN mkdir -p /etc/nginx/ssl
RUN apt install openssl -y
RUN openssl req -x509 -nodes -out /etc/nginx/ssl/transcendence.crt -keyout /etc/nginx/ssl/transcendence.key -subj "/C=FR/ST=IDF/L=Mulhouse/O=42/OU=42/CN=login.42.fr/UID=login"

EXPOSE 8000