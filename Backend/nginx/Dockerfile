FROM nginx:latest

COPY ./Backend/nginx/config/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY ./Backend/nginx/config/conf.d/nginx.conf /etc/nginx/nginx.conf
COPY ./Frontend usr/src/app/

EXPOSE 8000