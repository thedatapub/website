FROM nginx:1.19.1-alpine

ENV TZ=America/Mexico_City
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

LABEL maintainer="Domingo Suarez Torres <domingo.suarez@gmail.com>"



COPY ./site /usr/share/nginx/html