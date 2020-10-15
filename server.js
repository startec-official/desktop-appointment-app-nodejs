var dotenv = require('dotenv'); // module for accessing the environment file
var express = require('express'); // an API (called REST API) that allows servers to handle HTTP requests
var bodyParser = require('body-parser'); // module for parsing data from HTTP requests
const scheduleRouterExp = require('./rouotes/schedule'); // route file for schedules route
const clientsRouterExp = require('./routes/clients'); // route file for clients route
const deviceConn = require('./connections/serial-connection'); // imported module for establishing serial connection with arduino, find actual code import in this file 
const queueProcess = require('./queue/queue-process'); // module that contains code that handles what happens when data from arduino is recieved
const applog = require('./utils/debug-log'); // custom log module that can be switched off when deploying

// parser for serial input from arduino device, completes the buffer at newlines
const Readline = require('@serialport/parser-readline');
const parser = deviceConn.pipe(new Readline({ delimiter: '\r\n' }))
// uses the defined values in the environment variable
dotenv.config(); 
// express variables
var app = express(); // initializes express
// asks express to use a JSON body parser for incoming data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// defines the router files to use for specific routes
app.use('/schedule',scheduleRouterExp); // use this route file for schedule routes
app.use('/clients',clientsRouterExp); // use this route file for client routes

app.listen( process.env.PORT , () => { // starts a listener on the server port
  applog.log(`${process.env.APP_NAME} listening at http://${process.env.DB_HOST}:${process.env.PORT}`)
})

// TODO: send delay between SIM800L startup, arduino startup and server startup
// starts a listener on the port with the arduino device
parser.on('data', ( data ) => { // listens to incoming data from the serial once connected
  applog.log( data );
  queueProcess( data ); // send the data to be processed by the queue ,code found in the file
});