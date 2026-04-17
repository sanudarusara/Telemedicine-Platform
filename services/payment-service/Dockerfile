FROM node:20

WORKDIR /app

# Copy only this service's package files from the services build context
# (docker-compose sets build.context=./services). This avoids missing files
# and ensures `npm install` runs against the correct package.json.
COPY payment-service/package*.json ./

RUN npm install

# Copy service sources
COPY payment-service ./

# Copy shared utilities available at the services build context
COPY shared ./shared

EXPOSE 5004

CMD ["npm", "start"]