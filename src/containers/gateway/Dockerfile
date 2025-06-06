#
# Build web-application.
#
FROM node:18-alpine AS frontend

WORKDIR /opt/frontend

# copy package.json and package-lock.json to prevent re-running npm ci on every code change
COPY ./frontend/package.json ./
COPY ./frontend/package-lock.json ./

RUN npm ci

#
# Build the application.
#
FROM frontend AS build
# copy the rest of the source codes and build the application
COPY ./frontend/ ./

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

#
# Prepare passwords.
#
FROM debian:bookworm-slim AS htpasswd

RUN apt-get update && apt-get -y install apache2-utils

ARG WEB_SERVICE_USER
ARG WEB_SERVICE_PASS

WORKDIR /opt/htpasswd
# https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
RUN htpasswd -b -c /opt/htpasswd/.htpasswd ${WEB_SERVICE_USER} ${WEB_SERVICE_PASS}

#
#
#
FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /opt/frontend/dist /opt/plankweb-frontend
COPY --from=htpasswd /opt/htpasswd/.htpasswd /etc/apache2/.htpasswd

COPY ./containers/gateway/nginx/gateway.conf /etc/nginx/conf.d/
COPY ./containers/gateway/nginx/cors.conf /etc/nginx/
COPY ./containers/gateway/nginx/restricted.conf /etc/nginx/