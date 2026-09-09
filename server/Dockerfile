FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV DB_FILE=/app/storage/data.sqlite
ENV PASSWORD_STORE_PATH=/app/storage/password-store.json

RUN mkdir -p /app/storage && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["npm", "start"]
