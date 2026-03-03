FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY shipping-worker.ts ./
COPY ../lib/types/shipping.ts ./lib/types/

RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --only=production

ENV NODE_ENV=production

CMD ["node", "dist/shipping-worker.js"]
