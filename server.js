var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
const router = require('./router');
var app = express();

dotenv.config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/',router);

app.listen( process.env.PORT , () => {
  console.log(`${process.env.APP_NAME} listening at http://localhost:${process.env.PORT}`)
})