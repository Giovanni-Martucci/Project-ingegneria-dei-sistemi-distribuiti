FROM node:14

RUN npm install express
RUN npm install cors
RUN npm install amqplib
RUN npm install request
COPY . .

EXPOSE 4500

CMD ["node","index.js"]

