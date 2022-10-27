const express = require('express')
const cors = require('cors');

//RabbitMQ
var amqp = require('amqplib/callback_api');

const app = express();
const port = 4000;
const host = "0.0.0.0";

app.use(cors());
app.use(express.urlencoded({ extended: true }));   //sostituito a bodyparser
app.use(express.json());                           //sostituito a bodyparser




const topic_list = ['die'];


// let send = () => {
//     // Producer RabbitMQ
//     amqp.connect('amqp://localhost', function(error0, connection) {
//         if (error0) {
//             throw error0;
//         }
//         connection.createChannel(function(error1, channel) {
//             if (error1) {throw error1;}
            
//             var exchange = 'direct_logs';
//             var topic = 'random_number';

//             channel.assertExchange(exchange, 'direct', {durable: false});

//             var msg = Math.floor(Math.random() * 7).toString();
//             if(msg=="0") { msg = "1";}

//             channel.publish(exchange, topic, Buffer.from(msg));
//             console.log(" [x] Sent %s: '%s'", topic, msg);
            
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
//                     if(msg.content.toString() == "get_die"){send();}
//                 }, {
//                     noAck: true
//                 });
//             });
//         });
//     });    
// }


let generate_number = () => {
    var msg = Math.floor(Math.random() * 7).toString();
    if(msg=="0") { msg = "1";}
    return msg;
}

let consumer = () => {
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
            throw error1;
            }
            var queue = 'rpc_queue_die';

            channel.assertQueue(queue, {
                durable: false
            });
            channel.prefetch(1);
            console.log(' [x] Awaiting RPC requests');
            channel.consume(queue, function reply(msg) {
                if(msg.content.toString() == "get_die"){
                    // send();
                    let die = generate_number();
                    let result = "random_number:" + die.toString();
                    console.log(result)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from(result.toString()), {
                            correlationId: msg.properties.correlationId
                        });
                    channel.ack(msg);                
                }
            });
        });
    });
}


consumer();






