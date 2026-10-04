FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run typecheck && npm test && npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY migrations ./migrations

RUN addgroup -S app \
    && adduser -S -G app app \
    && mkdir -p /app/data/whatsapp-sessions \
    && chown -R app:app /app

USER app

EXPOSE 3410

CMD ["node", "dist/src/server.js"]
