FROM node:20.2.0-alpine3.18

WORKDIR /app

COPY ./ .

RUN npm install

CMD ["npm", "run", "dev:host"]
