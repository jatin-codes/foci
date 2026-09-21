# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.base.json ./
COPY shared ./shared
COPY server ./server
COPY client ./client
RUN npm run build

# Runtime stage: production dependencies and build output only
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_FILE=/data/todos.json
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

RUN mkdir /data && chown node:node /data
VOLUME /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://localhost:${PORT}/health" || exit 1
CMD ["node", "--enable-source-maps", "server/dist/server.js"]
