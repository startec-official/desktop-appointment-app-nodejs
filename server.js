var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
const router = require('./router');
const deviceConn = require('./connectDevice');

const Readline = require('@serialport/parser-readline')

var app = express();

const parser = deviceConn.pipe(new Readline({ delimiter: '\r\n' }))
parser.on('data', console.log) // TODO: put switch case function here

dotenv.config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/',router);

app.listen( process.env.PORT , () => {
  console.log(`${process.env.APP_NAME} listening at http://localhost:${process.env.PORT}`)
})