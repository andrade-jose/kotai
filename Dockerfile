FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY public/ ./public/
EXPOSE 3002
CMD ["node", "server/index.js"]
