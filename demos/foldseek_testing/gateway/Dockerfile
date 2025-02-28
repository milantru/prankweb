#
# Build web-application.
#
FROM node:19.7-bullseye AS frontend

WORKDIR /opt/frontend

# copy package.json and package-lock.json to prevent re-running npm ci on every code change
COPY ./src/frontend/package.json ./
COPY ./src/frontend/package-lock.json ./

RUN npm ci

#
# Build the application.
#
FROM frontend AS build
# copy the rest of the source codes and build the application
COPY ./src/frontend/ ./

RUN npm run build

#
#
#
FROM nginx:1.25.2

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /opt/frontend/dist /opt/prankweb-frontend

COPY ./demos/foldseek_testing/gateway/nginx/gateway.conf /etc/nginx/conf.d/
COPY ./demos/foldseek_testing/gateway/nginx/cors.conf /etc/nginx/
#COPY ./gateway/nginx/restricted.conf /etc/nginx/