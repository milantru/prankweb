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

RUN npm run build

#
#
#
FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /opt/frontend/dist /opt/prankweb-frontend

COPY ./containers/gateway/nginx/gateway.conf /etc/nginx/conf.d/
COPY ./containers/gateway/nginx/cors.conf /etc/nginx/
#COPY ./gateway/nginx/restricted.conf /etc/nginx/