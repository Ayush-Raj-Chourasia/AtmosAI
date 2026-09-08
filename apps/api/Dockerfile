FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY n-weis-shared-1.0.0.tgz ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY n-weis-shared-1.0.0.tgz ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./src/database/schema.sql

EXPOSE 3001

CMD ["node", "dist/main"]
