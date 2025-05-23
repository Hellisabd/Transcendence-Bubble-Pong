FROM nginx:latest

ARG USER_ID=${USER_ID}
ARG GROUP_ID=${GROUP_ID}

RUN echo "Using USER_ID=${USER_ID} and GROUP_ID=${GROUP_ID}"

RUN getent group nginx_new_group || groupadd -g ${GROUP_ID} nginx_new_group
RUN getent passwd nginx || useradd -m -u ${USER_ID} -g nginx_new_group nginx

COPY ./Backend/nginx/config/conf.d/nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /etc/nginx/ssl
RUN apt install openssl -y
RUN openssl req -x509 -nodes -out /etc/nginx/ssl/transcendence.crt -keyout /etc/nginx/ssl/transcendence.key -subj "/C=FR/ST=Alsace/L=Mulhouse/O=42/OU=42/CN=transcendence" -addext "subjectAltName = DNS:nginx, DNS:localhost, IP:127.0.0.1, IP:::1"
RUN chown -R nginx:nginx_new_group /etc/nginx/ssl
RUN chmod -R 644 /etc/nginx/ssl/*
RUN mkdir -p /var/cache/nginx/client_temp
RUN chown -R nginx:nginx_new_group /var
RUN chmod -R 777 /var/cache/nginx
RUN touch  /var/run/nginx.pid
RUN chmod -R 777 /var/run/nginx.pid
# RUN rm /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 8000
