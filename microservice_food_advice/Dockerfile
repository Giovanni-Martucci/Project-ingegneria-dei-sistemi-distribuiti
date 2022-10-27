FROM node:14

RUN npm install express
RUN npm install cors
RUN npm install amqplib
RUN npm install request

COPY . .

#EXPOSE 8000

CMD ["node","index.js"]

