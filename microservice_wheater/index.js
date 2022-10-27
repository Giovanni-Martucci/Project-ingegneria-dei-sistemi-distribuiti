const express = require('express')
const cors = require('cors');
const request = require('request');

// RabbitMQ
var amqp = require('amqplib/callback_api');

// const amqpUrl = process.env.AMQP_URL || 'amqp://localhost:5672';

// const rabbitSetting = {
//     protocol: 'amqp',
//     hostname: 'localhost',
//     port: 5672,
//     username: 'isd',
//     password: 'isd',
//     vhost: '/',
//     authMechanism: ['PLAIN','AMQPLAIN','EXTERNAL']
// }

const app = express();
const port = 4500;
const host = '0.0.0.0';

app.use(cors());
app.use(express.urlencoded({ extended: true }));   //sostituito a bodyparser
app.use(express.json());                           //sostituito a bodyparser


const options = {
  method: 'GET',
  url: 'https://visual-crossing-weather.p.rapidapi.com/forecast',
  qs: {
    aggregateHours: '24',
    location: 'Catania',
    contentType: 'csv',
    unitGroup: 'us',
    shortColumnNames: '0'
  },
  headers: {
    'X-RapidAPI-Key': '9c387590abmsha05aaa242de1bc1p1f0e62jsnd06a21df30da',
    'X-RapidAPI-Host': 'visual-crossing-weather.p.rapidapi.com',
    useQueryString: true
  }
};


const topic_list = ['wheater'];

// let send = () => {
//     // Producer RabbitMQ
//     amqp.connect('amqp://localhost', function(error0, connection) {
//         if (error0) {
//             throw error0;
//         }
//         connection.createChannel(function(error1, channel) {
//             if (error1) {throw error1;}
            
//             var exchange = 'direct_logs';
//             var topic = 'wheater_reply';

//             channel.assertExchange(exchange, 'direct', {durable: false});

//             var msg = "";
//             request(options, function (error, response, body) {
//                 if (error) throw new Error(error);
//                 msg = body.split('"');
//                 reply = msg[7] + ";" + msg[9];
//                 channel.publish(exchange, topic, Buffer.from(reply));
//                 console.log(" [x] Sent %s: '%s'", topic, reply);
//             });            
//         });
//     });
// }

// let consumer = () => {
//     amqp.connect('amqp://localhost', function(error0, connection) {
//         if (error0) {throw error0;}
//         connection.createChannel(function(error1, channel) {
//             if (error1) {throw error1;}
//             var exchange = 'direct_logs';
    
//             channel.assertExchange(exchange, 'direct', {
//                 durable: false
//             });
    
//             channel.assertQueue('', {
//                 exclusive: true
//             }, function(error2, q) {
//                 if (error2) {throw error2;}
    
//                 topic_list.forEach(function(topic) {
//                     channel.bindQueue(q.queue, exchange, topic);
//                 });
    
//                 channel.consume(q.queue, function(msg) {
//                     var mess = msg.content.toString().split(":");
//                     if(mess[0] == "get_wheater"){
//                         options.qs.location = mess[1];
//                         send();
//                     }
//                 }, {
//                     noAck: true
//                 });
//             });
//         });
//     });    
// }


let consumer = () => {
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
            throw error1;
            }
            var queue = 'rpc_queue_wheater';

            channel.assertQueue(queue, {
                durable: false
            });
            channel.prefetch(1);
            console.log(' [x] Awaiting RPC requests');
            channel.consume(queue, function reply(msg) {
                console.log(msg.content.toString());
                var mess = msg.content.toString().split(":");
                if(mess[0] == "get_wheater"){
                    // send();
                    options.qs.location = mess[1];
                    var reply_api = "";
                    request(options, function (error, response, body) {
                        if (error) throw new Error(error);
                        reply_api = body.split('"');
                        let replys = reply_api[7] + ";" + reply_api[9];
                        console.log(" [x] Sent wheater_reply: '%s'", replys);
                        let result = "wheater_reply:" + replys.toString();
                        console.log(result)
                        channel.sendToQueue(msg.properties.replyTo,
                            Buffer.from(result.toString()), {
                                correlationId: msg.properties.correlationId
                            });
                        channel.ack(msg);    
                    });   
                                
                }
            });
        });
    });
}


consumer();