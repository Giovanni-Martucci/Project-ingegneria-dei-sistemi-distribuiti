# ISD-PROJECT
### Management of permissions and communication between services and users.

### Topics covered:
  - Communication through RabbitMQ: Routing and RPC
  - Design patterns:
     - Reference Monitor
     - Timeout()

## USAGE

1) Install Node.js;
2) Install Angular;
3) Install RabbitMQ from homebrew;

4) New terminal: ``` rabbitmq-server ```
5) New terminal:
        ```
         - cd frontend
         - ng serve
        ```
6) New terminal:
        ```
        - cd backend
        - node index.js
        ```
7) New terminal:
        ```
        - cd microservice_food_advice
        - node index.js
        ```
8) New terminal:
        ```
        - cd microservice_wheater
        - node index.js 
        ```
9) New terminal:
        ```
        - cd microservice_rand_number
        - node index.js 
        ```

10) Go to http://localhost:4200 ;


## USAGE WITH DOCKER SWARM

1) New terminal: ``` docker swarm init ```
2) [OPTIONAL] New machines (node worker) terminal: insert code provided by master;
3) Terminal master: ``` docker stack deploy -c docker-compose.yml projectisd ```
4) Go to http://localhost 



** GO TO http://localhost:15672 for RabbitMQ panel (user:guest;password:guest);
** GO TO http://localhost:8080 for displaying the containers distributed in the various nodes of the swarm;


