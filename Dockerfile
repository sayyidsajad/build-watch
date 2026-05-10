FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build

EXPOSE 8081

CMD ["npm", "start"]