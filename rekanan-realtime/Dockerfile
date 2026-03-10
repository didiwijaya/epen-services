FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY server.js ./server.js
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]

