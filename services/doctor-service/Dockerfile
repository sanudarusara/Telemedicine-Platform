FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5006

CMD ["npm", "start"]