var express = require('express');
var port = require('./connections/serial-connection');

var router = express.Router()
var connection = require('./connections/mysql-connection');

// TODO: separate routes according to type

router.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO:write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

router.get('/display',(req,res)=> {
    connection.query('SELECT * FROM clients', function (err, rows, fields) { 
        if (err) throw err
        res.json(rows);
    })  
});

router.get( '/display/schedules' , (req,res) => {
    connection.query( 'SELECT DISTINCT sched_date FROM schedule WHERE sched_slots > 0' , ( err,rows,fields ) => {
        if( err ) throw err;
        res.json( rows );
    });
} )

router.post('/save',(req,res) => {

// generate array from input
let schedData = [];
for (let index = 0; index < req.body.length; index++) {
    schedData.push( [ req.body[index].date , req.body[index].time , 0 , req.body[index].appCount ] );
}
let saveQuery = '';
if ( schedData.length > 0 ) { // TODO: separate delete query
    saveQuery = ` 
    DELETE FROM schedule;
    INSERT INTO schedule (
        sched_date,
        sched_time,
        sched_taken,
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

router.get( '/remove/:userId' , (req,res,next) => { // TODO: secure queries with hashed auth or headers
    const id = parseInt( req.params.userId , 10 );
    connection.query( 'DELETE FROM clients WHERE client_id = ?' , id , (err , rows , fields) => {
        if( err ) throw err;
    });
    res.json( { message : "deletion success" } );
});

router.delete('/clear' , ( req , res , next ) => {
    connection.query( 'DELETE FROM schedule' , (err, res, fields) => {
        if( err ) throw err;    
        console.log( res );
    });
});

router.post( '/testWrite' , (req,res) => {
    const inputString = `${req.body.message}\n`;
    port.write( inputString , function(err) {
        if (err) {
          return console.log('Error on write: ', err.message);
        }
        console.log('message written!');
      })
});

module.exports = router;
