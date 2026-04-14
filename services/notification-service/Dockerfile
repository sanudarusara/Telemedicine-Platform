FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY notification-service/package.json ./
RUN npm install --production --no-audit --no-fund

# Copy source from the compose build context (services/)
COPY notification-service/src ./src

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003
CMD ["node", "src/server.js"]
