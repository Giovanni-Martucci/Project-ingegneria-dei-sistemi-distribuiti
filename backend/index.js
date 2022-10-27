
var firebase = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://herman-ef43f-default-rtdb.europe-west1.firebasedatabase.app"
});

var db = firebase.database();


const express = require('express')
const cors = require('cors');
const https = require('https') //quando il microservizio sarà deployato effettivamente
const http = require('http');
const { resolve } = require('path');
// RabbitMQ 
var amqp = require('amqplib/callback_api');
const { time } = require('console');

const app = express();
const port = 3000;
const host = '0.0.0.0'

const options_temperature = { //TODO: indirizzi ip tramite database 
  hostname: '0.0.0.0', // or 0.0.0.0 - temp //TODO: indirizzi ip tramite database 
  port: 4000,
  path: '/temperature',
  method: 'GET'
}
const options_rain = {
  hostname: '0.0.0.0', // or 0.0.0.0 - //TODO: indirizzi ip tramite database 
  port: 5000,
  path: '/rain',
  method: 'GET'
}
const options_sunny = {
  hostname: '0.0.0.0', // or 0.0.0.0 //nomedelservizio -  //TODO: indirizzi ip tramite database 
  port: 8000,
  path: '/sunny',
  method: 'GET'
}
const options_movies = {
  hostname: '0.0.0.0', // or 0.0.0.0 //nomedelservizio -  //TODO: indirizzi ip tramite database 
  port: 4500,
  path: '/movies',
  method: 'GET'
}

app.use(cors());
app.use(express.urlencoded({ extended: true }));   //sostituito a bodyparser
app.use(express.json());                           //sostituito a bodyparser

let state = {
  "wheater": {
    "city": "-",
    "conditions": "-",
  },
  "food": {
    "label": "-",
    "image": "-",
    "url": "-",
  },
  "random_number": "-",
}

let authorization_user = {}
console.log(authorization_user)

let consumer = (topic_list) => {
  return new Promise((resolve,reject) => {
  // Producer RabbitMQ
    amqp.connect('amqp://localhost', function (error0, connection) {
      if (error0) {
        throw error0;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }
        var exchange = 'direct_logs';

        channel.assertExchange(exchange, 'direct', {
          durable: false
        });

        channel.assertQueue('', {
          exclusive: true
        }, function (error2, q) {
          if (error2) {
            throw error2;
          }

          topic_list.forEach(function (topic) {
            channel.bindQueue(q.queue, exchange, topic);
          });

          channel.consume(q.queue, function (msg) {
            if (msg.fields.routingKey == "wheater_reply") {
              var mss = msg.content.toString().split(";");
              resolve({"city":mss[0], "conditions":mss[1]}); //eliminare
            }
            else if (msg.fields.routingKey == "food_result") {
              var mss = JSON.parse(msg.content.toString());
              resolve({"label":mss["label"], "image":mss["image"], "url":mss["url"]});
              // state['food']['label'] = mss["label"];
              // state['food']['image'] = mss["image"];
              // state['food']['url'] = mss["url"];
            }
            else {
              state[msg.fields.routingKey] = msg.content.toString();
              console.log(msg.content.toString());
              resolve(msg.content.toString());
            }
          }, {
            noAck: true
          });
        });
      });
    });
  });
}

//Per settare un timout alla funzione Consumer (new promise)
const timeout = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 6000, 'timeout');
  });
}


let setTimeoutConsumer = (mess,item) => {
  return new Promise( resolve => {
    Promise.race([send_rpc_request(mess,item), timeout()]).then((value) => {
      console.log(value);
      resolve(value);
    });
  });
}

let send = (topic_chose, mess, item) => {
    // Producer RabbitMQ
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {throw error1;}
            
            var exchange = 'direct_logs';
            var topic = topic_chose;

            channel.assertExchange(exchange, 'direct', {durable: false});
            if(item == null){var msg = mess;}
            else {var msg = mess + ":" + item;}
            
            channel.publish(exchange, topic, Buffer.from(msg));
        });
    });
}

const topic_list = ['wheater', 'random_number', 'food_result'];

// consumer(topic_list); ?

function generateUuid() {
  return Math.random().toString() +
      Math.random().toString() +
      Math.random().toString();
}

let send_rpc_request = (mess, item) => {
  return new Promise((resolve,reject) => {
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            channel.assertQueue('', {
                exclusive: true
            }, function(error2, q) {
                if (error2) {
                    throw error2;
                }
                var correlationId = generateUuid();
                
                if(item == null){var msg = mess;}
                else {var msg = mess + ":" + item;}

                channel.consume(q.queue, function(msg) {
                    if (msg.properties.correlationId === correlationId) {
                      reply = msg.content.toString().split(/:(.*)/s)
                      console.log(' [.] Got %s:%s', reply[0], reply[1]);
                      
                        
                        
                      if (reply[0] == "wheater_reply") {
                        var mss = reply[1].split(";");
                        resolve({"city":mss[0], "conditions":mss[1]});

                      }
                      else if (reply[0] == "food_result") {
                        var mss = JSON.parse(reply[1]);
                        console.log(mss);
                        resolve({"label":mss["label"], "image":mss["image"], "url":mss["url"]});
                      }
                      else {
                        state[reply[0]] = reply[1];
                        console.log(reply[1]);
                        resolve(reply[1].toString());
                      }

                    }
                }, {
                    noAck: true
                });
                
                if(mess == "get_die") {
                  channel.sendToQueue('rpc_queue_die',
                    Buffer.from(msg.toString()), {
                        correlationId: correlationId,
                        replyTo: q.queue
                    });
                }
                else if(mess == "get_wheater"){
                  channel.sendToQueue('rpc_queue_wheater',
                    Buffer.from(msg.toString()), {
                        correlationId: correlationId,
                        replyTo: q.queue
                    });
                }
                else if(mess == "get_food"){
                  channel.sendToQueue('rpc_queue_food',
                    Buffer.from(msg.toString()), {
                        correlationId: correlationId,
                        replyTo: q.queue
                    });
                }
                
            });
        });
    });
  });
}





app.get('/rolldie', async (req, res) => {
  console.log("Richiesto numero...");
  if(typeof authorization_user[req.query.user]?.["die"] != "undefined") { //perche tanto non cambierà nel tempo il permesso. Una volta estratto per quell'utente, sempre quello rimarrà, quindi inutile accedere per ogni richiesta al database
    console.log("[*] - Adesso sto controllando l'autorizzazione per il dado salvata nella cache");
    if(authorization_user[req.query.user].die == true) {

      // RABBITMQ: TOPIC
      // send("die", "get_die", null);
      // let random_number = await setTimeoutConsumer(['random_number'])
      
      //RABBITMQ: RPC
      let random_number = await setTimeoutConsumer( "get_die", null);

      let timestamp = getTimestamp();
      let result = {random_number: random_number, timestamp: timestamp};
      console.log(result);
      res.contentType('application/json');
      res.json(result);
    }
    else{
      let timestamp = getTimestamp();
      let result = {random_number: "access_denied", timestamp: timestamp};
      res.contentType('application/json');
      res.json(result);
    }
    
  }
  else {
    console.log("[*] - Controllo nel database i permessi ");
    var db = firebase.database();
    var ref = db.ref("permissions/"+req.query.user);
    ref.once("value", async function(snapshot) {
      var check_permissions = snapshot.val();
      console.log("[+] - Copio i permessi sulla Cache");
      if(typeof authorization_user[req.query.user] != "undefined"){
        authorization_user[req.query.user]["die"] = check_permissions.die;
      }
      else {
        authorization_user[req.query.user] = {"die": check_permissions.die};
      }
      console.log(authorization_user);
      if(check_permissions.die){
        //RABBITMQ: TOPIC
        // send("die", "get_die", null);
        // let random_number = await setTimeoutConsumer(['random_number'])

        //RABBITMQ: RPC
        let random_number = await setTimeoutConsumer( "get_die", null);

        let timestamp = getTimestamp();
        let result = {random_number: random_number, timestamp: timestamp};
        console.log(result);
        res.contentType('application/json');
        res.json(result);
      }
      else {
        let timestamp = getTimestamp();
        let result = {random_number: "access_denied", timestamp: timestamp};
        res.contentType('application/json');
        res.json(result);
      }
    });
  }
})

app.get('/wheater', async (req, res) => {
  console.log("Richiesto meteo per:");
  console.log(req.query.city);
  if(typeof authorization_user[req.query.user]?.["wheater"] != "undefined") { //perche tanto non cambierà nel tempo il permesso. Una volta estratto per quell'utente, sempre quello rimarrà, quindi inutile accedere per ogni richiesta al database
    console.log("[*] - Adesso sto controllando l'autorizzazione per il meteo salvata nella cache");
    if(authorization_user[req.query.user].wheater == true) {
      //RABBITMQ: RPC
      // send("wheater", "get_wheater", req.query.city);
      // let wheater = await setTimeoutConsumer(['wheater_reply']);
      
      //RABBITMQ: RPC
      let wheater = await setTimeoutConsumer( "get_wheater", req.query.city);

      let timestamp = getTimestamp();
      let result = {wheater: wheater, timestamp: timestamp};
      console.log(result);
      res.contentType('application/json');
      res.json(result);
    }
    else{
      let timestamp = getTimestamp();
      let result = {wheater: "access_denied", timestamp: timestamp};
      res.contentType('application/json');
      res.json(result);
    }
    
  }
  else {
    console.log("[*] - Controllo nel database i permessi ");
    var db = firebase.database();
    var ref = db.ref("permissions/"+req.query.user);
    ref.once("value", async function(snapshot) {
      var check_permissions = snapshot.val();
      console.log("[+] - Copio i permessi sulla Cache");
      if(typeof authorization_user[req.query.user] != "undefined"){
        authorization_user[req.query.user]["wheater"] = check_permissions.wheater;
      }
      else {
        authorization_user[req.query.user] = {"wheater": check_permissions.wheater};
      }
      console.log(authorization_user);
      if(check_permissions.wheater){
        //RABBITMQ: TOPIC
        // send("wheater", "get_wheater", req.query.city);
        // let wheater = await setTimeoutConsumer(['wheater_reply']);

        //RABBITMQ: RPC
        let wheater = await setTimeoutConsumer( "get_wheater", req.query.city);

        let timestamp = getTimestamp();
        let result = {wheater: wheater, timestamp: timestamp};
        console.log(result);
        res.contentType('application/json');
        res.json(result);
      }
      else {
        let timestamp = getTimestamp();
        let result = {wheater: "access_denied", timestamp: timestamp};
        res.contentType('application/json');
        res.json(result);
      }
    });
  }
})

app.get('/food', async (req, res) => {
  console.log("Richiesto ricetta per:");
  console.log(req.query.item);
  if(typeof authorization_user[req.query.user]?.["ricetta"] != "undefined") { //perche tanto non cambierà nel tempo il permesso. Una volta estratto per quell'utente, sempre quello rimarrà, quindi inutile accedere per ogni richiesta al database
    console.log("[*] - Adesso sto controllando l'autorizzazione per ricettario salvata nella cache");
    if(authorization_user[req.query.user].ricetta == true) {
      //RABBITMQ: TOPIC
      // send("food", "get_food", req.query.item);
      // let food = await setTimeoutConsumer(['food_result']);

      //RABBITMQ: RPC
      let food = await setTimeoutConsumer( "get_food", req.query.item);

      let timestamp = getTimestamp();
      let result = {food: food, timestamp: timestamp};

      res.contentType('application/json');
      res.json(result);
    }
    else{
      let timestamp = getTimestamp();
      let result = {food: "access_denied", timestamp: timestamp};
      res.contentType('application/json');
      res.json(result);
    }
    
  }
  else {
    console.log("[*] - Controllo nel database i permessi ");
    var db = firebase.database();
    var ref = db.ref("permissions/"+req.query.user);
    ref.once("value", async function(snapshot) {
      var check_permissions = snapshot.val();
      console.log("[+] - Copio i permessi sulla cache");
      if(typeof authorization_user[req.query.user] != "undefined"){
        authorization_user[req.query.user]["ricetta"] = check_permissions.ricetta;
      }
      else {
        authorization_user[req.query.user] = {"ricetta": check_permissions.ricetta};
      }
      
      console.log(authorization_user);
      if(check_permissions.ricetta){
        //RABBITMQ: TOPIC
        // send("food", "get_food", req.query.item);
        // let food = await setTimeoutConsumer(['food_result']);

        //RABBITMQ: RPC
        let food = await setTimeoutConsumer( "get_food", req.query.item);
        
        let timestamp = getTimestamp();
        let result = {food: food, timestamp: timestamp};

        res.contentType('application/json');
        res.json(result);
      }
      else {
        let timestamp = getTimestamp();
        let result = {food: "access_denied", timestamp: timestamp};
        res.contentType('application/json');
        res.json(result);
      }
    });
  }
})


app.listen(port, host);
console.log(`\n[*] - Back-end listening on port ${host}:${port}!`);




// ARROW FUNCTIONS

let getTimestamp = () => {
  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  // prints date & time in YYYY-MM-DD HH:MM:SS format
  let output = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds; 
  return output;
};

// Microservice of temperature
let get_temp_from_micros = () => {
  return new Promise((resolve,reject) => {
    const req = http.request(options_temperature, res => { //da sostituire con https
      res.on('data', d => {
        // process.stdout.write(d);
        let output = d.toString().split(":")[1].replace('"', '').replace('"}','');
        resolve(output)
      })
    })
    req.on('error', error => {
      console.error(error)
      reject(error)
    })
    req.end()
  });
}

// Microservice of umidity
let get_rain_from_micros = () => {
  return new Promise((resolve,reject) => {
    const req = http.request(options_rain, res => { //da sostituire con https
      res.on('data', d => {
        // process.stdout.write(d);
        let output = d.toString().split(":")[1].replace('"', '').replace('"}','');
        resolve(output)
      })
    })
    req.on('error', error => {
      console.error(error)
      reject(error)
    })
    req.end()
  });
}

// Microservice of ph
let get_sunny_from_micros = () => {
  return new Promise((resolve,reject) => {
    const req = http.request(options_sunny, res => { //da sostituire con https
      res.on('data', d => {
        // process.stdout.write(d);
        let output = d.toString().split(":")[1].replace('"', '').replace('"}','');
        resolve(output)
      })
    })
    req.on('error', error => {
      console.error(error)
      reject(error)
    })
    req.end()
  });
}


