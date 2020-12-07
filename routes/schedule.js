var express = require('express'); // an API (called REST API) that allows servers to handle HTTP requests
var ox = require('../utils/queue-manager'); // module for handling queue processes
var scheduleRouter = express.Router() // start the express service
var connection = require('../connections/mysql-connection'); // // module that allows connecting to a mysql database
var applog = require('../utils/debug-log'); // custom log module that can be switched off when deploying
var moment = require('moment'); // handly module for working with dates and times

/*
    schedule table schema:
        sched_date - contains date of the appointment in 'Month day, Year, dayOfWeek' format
        sched_time - contains string of time range for appointment
        sched_taken - number of slots taken for the date and time
        sched_slots - total number of sched slots declared available in the form
*/

scheduleRouter.use(function (req, res, next) { // define the headers the router uses
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

scheduleRouter.post('/overwriteSaveTo',(req,res) => { // saves input schedule to the database and clears previous entries

    // generate array from input
    let schedData = [];
    for (let index = 0; index < req.body.length; index++) {
        schedData.push( [ req.body[index].date , req.body[index].time , 0 , req.body[index].appCount ] ); // save schedule data retrieved from client as JSON object into local variable array
    }
    const deleteSchedulePromise = new Promise((resolve,reject)=>{ // promise that resolves when the previous client schedule has been cleared
       connection.query('DELETE FROM schedule',(err,rows,fields)=>{
           if(err) reject(err); // TODO: error handling
           resolve('OK'); // sends the OK status signalling successful completion
       });
    });
    deleteSchedulePromise.then( (deleteSchedStatus) => {
        if ( schedData.length > 0 ) { // TODO: separate delete query
            // query string construction for easier readability
            saveQuery = ` 
            INSERT INTO schedule (
                sched_date,
                sched_time,
                sched_taken,
                sched_slots
            )
            VALUES ?
            `;
            connection.query(saveQuery, [schedData], (err, rows, fields) => {
            if (err) throw err; // TODO: error handling
            applog.log("Connected to mySQL Server! The query finished with the following response:");
            applog.log( rows );
            res.sendStatus(200); // sends the OK status signalling successful completion 
            });
        }
        else {
            res.sendStatus(200); // sends the OK status signalling successful completion
        }
    }).catch((err)=>{
        applog.log(err);
        res.sendStatus(500); // sends the server failure status
    });
});

scheduleRouter.post( '/changeslot/:schedDate/:schedTime/:increment' , (req,res) => { // update the slots in the schedules database to match number of clients who fill them up
    const date = moment(req.params.schedDate).format('MMMM Do YYYY, dddd'); // convert retrieved date passed as parameter and convert into format that matches the table
    const time = req.params.schedTime;
    const increment = parseInt(req.params.increment); // varaible that holds by how much the number of slots should change
    console.log(`increment: ${increment}`);
    console.log(`date: ${date} & time: ${time}`);
    connection.query(`UPDATE schedule SET sched_taken = sched_taken + ${increment} WHERE sched_date = '${date}' AND sched_time = '${time}'` , date , (err,rows,fields) => {
        if(err) throw err; // TODO: error handling
        console.log(`message sent succesfully...`);
        res.sendStatus(200);
    });
});

scheduleRouter.post('/fillslot/:schedDate',(req,res)=>{ // fill the slots of the specified date so it can no longer be avaiable, executed when using the unaviable page
    const date = req.params.schedDate;
    connection.query(' UPDATE schedule SET sched_taken = sched_slots WHERE sched_date = ?',date,(err,rows,fields)=>{
        if(err) throw err;
        res.sendStatus(200);
    });
});

scheduleRouter.delete('/clearAll' , ( req , res , next ) => { // delete all entries from the schedule, route reserved for debugging
    connection.query( 'DELETE FROM schedule' , (err, res, fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

scheduleRouter.get( '/select/out' , (req,res) => { // select the dates and times where there are available slots
    connection.query( 'SELECT DISTINCT sched_date FROM schedule WHERE sched_slots > 0 AND sched_taken < sched_slots' , ( err,rows,fields ) => { // TODO: check up on this piece of code
        if( err ) throw err;
        res.json( rows ); // send the data as a JSON object
    });
});

scheduleRouter.get( '/select/open' , (req,res) => { // selects the date, time, number of slots taken and the number of total slots for an available date and time
    connection.query( 'SELECT sched_date,sched_time,sched_taken,sched_slots FROM schedule WHERE sched_taken < sched_slots' , (err,rows,fields) => {
        if(err) throw err;
        res.json( rows );
    });
});
// TODO: fix issue with reschedule not leaving slots, probably check if process still running in client-side as well
scheduleRouter.get('/getresched', (req,res) => { // get all data from the reschedule clients table
    const query = 'SELECT * FROM reschedule_clients';
    connection.query( query , ( err , rows , fields )=>{
        if( err ) throw err;
        res.json( rows );
    });
});

scheduleRouter.post( '/testWrite' , (req,res) => { // debug route
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
