FROM node:14

RUN npm install express
RUN npm install cors
RUN npm install amqplib

COPY . .

EXPOSE 4000

CMD ["node","index.js"]

