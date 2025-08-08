FROM node:22

WORKDIR /app

COPY ./.next/ ./.next
COPY ./public ./public
COPY ./node_modules ./node_modules
COPY ./package.json ./package.json

EXPOSE 3000
