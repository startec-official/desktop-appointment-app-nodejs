var mysql = require('mysql');
var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser')

var app = express();

dotenv.config();

var connection = mysql.createConnection({
  host: `${process.env.DB_HOST}`,
  user: `${process.env.DB_USER}`,
  password: `${process.env.password}`,
  database: `${process.env.database}`,
  multipleStatements : true
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// place routes in ROUTER

app.use(function (req, res, next) { // TODO: run this on startup
  res.setHeader('Access-Control-Allow-Origin', '*'); // TODO:write more secure headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
  });

app.get('/display',(req,res)=> {
  connection.connect()
  connection.query('SELECT * FROM clients', function (err, rows, fields) { 
    if (err) throw err
    res.send(rows);
  })

  connection.end()
});

app.post('/save',(req,res) => { // TODO: place more specific app labels

  // generate array from input
  let schedData = [];
  for (let index = 0; index < req.body.length; index++) {
    schedData.push( [ req.body[index].date , req.body[index].time , req.body[index].appCount ] );
  }
  let saveQuery = '';
  if ( schedData.length > 0 ) {
    saveQuery = ` 
    DELETE FROM schedule;
    INSERT INTO schedule (
        sched_date,
        sched_time,
        sched_slots
     )
     VALUES ?
  `;
    connection.query(saveQuery, [schedData], function (err, rows, fields) {
      if (err) throw err;
      console.log("Connected to mySQL Server! The query finished with the following response:");
      console.log( rows );
    })
  }

});

app.listen( process.env.PORT , () => {
  console.log(`${process.env.APP_NAME} listening at http://localhost:${process.env.PORT}`)
})