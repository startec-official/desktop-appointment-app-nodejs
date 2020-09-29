var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
const scheduleRouterExp = require('./routes/schedule');
const clientsRouterExp = require('./routes/clients');
const deviceConn = require('./connections/serial-connection');
const queueProcess = require('./queue/queue-process');
const applog = require('./utils/debug-log');

const Readline = require('@serialport/parser-readline');

const parser = deviceConn.pipe(new Readline({ delimiter: '\r\n' }))

dotenv.config();

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/schedule',scheduleRouterExp);
app.use('/clients',clientsRouterExp);

app.listen( process.env.PORT , () => {
  applog.log(`${process.env.APP_NAME} listening at http://${process.env.DB_HOST}:${process.env.PORT}`)
})

// TODO: send delay between SIM800L startup, arduino startup and server startup

// var sendDone = false; // TODO: set a flag to prevent sending two messages at once 

// switch case for serial input
parser.on('data', ( data ) => {
  applog.log( data );
  queueProcess( data );
});