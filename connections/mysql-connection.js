var mysql = require('mysql'); // module that allows connection and querying to a mysql database
var dotenv = require('dotenv'); // module for accessing the environment file
// uses the defined values in the environment file
dotenv.config();

var connection = mysql.createConnection({ // create a connection instance
  host: `${process.env.DB_HOST}`,// actual values found in env variable, done to protect sensitive information
  user: `${process.env.DB_USER}`,
  password: `${process.env.password}`,
  database: `${process.env.database}`
});

module.exports = connection;