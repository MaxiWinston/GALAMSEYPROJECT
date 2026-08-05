FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Bake the live WebSocket URL at build time
ENV VITE_WS_URL=wss://galamsey-gateway-production.up.railway.app/ws
RUN npm run build

# Serve the static dist with a tiny HTTP server
FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/dist ./dist

CMD sh -c "serve -s dist -l ${PORT:-3000}"
