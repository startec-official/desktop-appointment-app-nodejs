var express = require('express');
var ox = require('../utils/queue-manager');
var scheduleRouter = express.Router()
var connection = require('../connections/mysql-connection');
var applog = require('../utils/debug-log');
var moment = require('moment');

scheduleRouter.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

scheduleRouter.post('/overwriteSaveTo',(req,res) => {

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
    applog.log("Connected to mySQL Server! The query finished with the following response:");
    applog.log( rows );
    res.sendStatus(200);
    })
}
else {
    res.sendStatus(200);
}
});

scheduleRouter.post( '/changeslot/:schedDate/:schedTime/:increment' , (req,res) => {
    const date = moment(req.params.schedDate).format('MMMM Do YYYY, dddd');
    const time = req.params.schedTime;
    const increment = parseInt(req.params.increment);
    connection.query(`UPDATE schedule SET sched_taken = sched_taken + ${increment} WHERE sched_date = '${date}' AND sched_time = '${time}'` , date , (err,rows,fields) => {
        if(err) throw err;
        res.sendStatus(200);
    });
});

scheduleRouter.post('/fillslot/:schedDate',(req,res)=>{
    const date = req.params.schedDate;
    connection.query(' UPDATE schedule SET sched_taken = sched_slots WHERE sched_date = ?',date,(err,rows,fields)=>{
        if(err) throw err;
        res.sendStatus(200);
    });
});

scheduleRouter.delete('/clearAll' , ( req , res , next ) => {
    connection.query( 'DELETE FROM schedule' , (err, res, fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

scheduleRouter.get( '/select/out' , (req,res) => {
    connection.query( 'SELECT DISTINCT sched_date FROM schedule WHERE sched_slots > 0 AND sched_taken < sched_slots' , ( err,rows,fields ) => {
        if( err ) throw err;
        res.json( rows );
    });
});

scheduleRouter.get( '/select/open' , (req,res) => {
    connection.query( 'SELECT sched_date,sched_time,sched_taken,sched_slots FROM schedule WHERE sched_taken < sched_slots' , (err,rows,fields) => {
        if(err) throw err;
        res.json( rows );
    });
});

scheduleRouter.get('/getresched', (req,res) => {
    const query = 'SELECT * FROM reschedule_clients';
    connection.query( query , ( err , rows , fields )=>{
        if( err ) throw err;
        res.json( rows );
    });
});

scheduleRouter.post( '/testWrite' , (req,res) => {
    const message = `${req.body.message}`;
    const phoneNo = `${req.body.number}`;
    ox.addJob({
        body : {
            type: 'SEND',
            number : phoneNo,
            message : message
        }
    });
});

module.exports = scheduleRouter;
