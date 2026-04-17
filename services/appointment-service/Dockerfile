FROM node:18-alpine

WORKDIR /usr/src/app

# When built from repo root context, copy the service package files from the subfolder
COPY appointment-service/package*.json ./
RUN npm install --production --no-audit --no-fund

# Copy service source
COPY appointment-service .

# Copy shared code so requires like '../../shared/..' resolve correctly from src/
COPY shared ./shared

EXPOSE 3001

CMD ["node", "src/server.js"]
