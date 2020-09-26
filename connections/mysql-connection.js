var mysql = require('mysql');
var dotenv = require('dotenv');
dotenv.config();

var connection = mysql.createConnection({
  host: `${process.env.DB_HOST}`,
  user: `${process.env.DB_USER}`,
  password: `${process.env.password}`,
  database: `${process.env.database}`,
  multipleStatements : true
});

module.exports = connection;