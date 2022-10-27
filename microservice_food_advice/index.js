const express = require('express')
const cors = require('cors');

const app = express();
const port = 8000;
const host = '0.0.0.0';

app.use(cors());
app.use(express.urlencoded({ extended: true }));   //sostituito a bodyparser
app.use(express.json());                           //sostituito a bodyparser


const request = require('request');

const options = {
  method: 'GET',
  url: 'https://edamam-recipe-search.p.rapidapi.com/search',
  qs: {q: 'pasta'},
  headers: {
    'X-RapidAPI-Key': '9c387590abmsha05aaa242de1bc1p1f0e62jsnd06a21df30da',
    'X-RapidAPI-Host': 'edamam-recipe-search.p.rapidapi.com',
    useQueryString: true
  }
};



// Producer RabbitMQ
var amqp = require('amqplib/callback_api');

const topic_list = ['food'];


// let send = (item) => {
//     // Producer RabbitMQ
//     amqp.connect('amqp://localhost', function(error0, connection) {
//         if (error0) {
//             throw error0;
//         }
//         connection.createChannel(function(error1, channel) {
//             if (error1) {throw error1;}
            
//             var exchange = 'direct_logs';
//             var topic = 'food_result';

//             channel.assertExchange(exchange, 'direct', {durable: false});

//             var msg = "";   
//             options.qs.q = item;
    
//             request(options, function (error, response, body) {
//                 if (error) throw new Error(error);
//                 var obj = JSON.parse(body);
//                 var index = Math.floor(Math.random() * 10);
//                 var label = obj["hits"][index]["recipe"]["label"] || null;
//                 var image = obj["hits"][index]["recipe"]["image"] || null;
//                 var url = obj["hits"][index]["recipe"]["url"] || null;
//                 var result = {label:label, image:image, url:url};
//                 channel.publish(exchange, topic, Buffer.from(JSON.stringify(result)));
//                 console.log(" [x] Sent %s: '%s'", topic, result);
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
//                     if(mess[0] == "get_food"){send(mess[1]);}
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
            var queue = 'rpc_queue_food';

            channel.assertQueue(queue, {
                durable: false
            });
            channel.prefetch(1);
            console.log(' [x] Awaiting RPC requests');
            channel.consume(queue, function reply(msg) {
                console.log(msg.content.toString());
                var mess = msg.content.toString().split(":");
                if(mess[0] == "get_food"){
                    // send();
                    var reply_msg = "";   
                    options.qs.q = mess[1];
        
                    request(options, function (error, response, body) {
                        if (error) throw new Error(error);
                        var obj = JSON.parse(body);
                        var index = Math.floor(Math.random() * 10);
                        var label = obj["hits"][index]["recipe"]["label"] || null;
                        var image = obj["hits"][index]["recipe"]["image"] || null;
                        var url = obj["hits"][index]["recipe"]["url"] || null;
                        var result = "food_result:" + JSON.stringify({label:label, image:image, url:url});
                        channel.sendToQueue(msg.properties.replyTo,
                            Buffer.from(result), {
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

