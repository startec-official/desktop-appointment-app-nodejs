var express = require('express'); // an API (called REST API) that allows servers to handle HTTP requests
var clientsRouter = express.Router(); // start the express service
var connection = require('../connections/mysql-connection'); // module that allows connecting to a mysql database
var moment = require('moment'); // handly module for working with dates and times
const ox = require('../utils/queue-manager'); // module for handling queue processes

/* 
    Client object schema (for client-side code):
        userId : number;
        name : string;
        date : Moment;
        time : string;
        order : number;
        contactNumber : string;
        code : string;
        reason? : string;

    client (and resched_client) table schema (backend):
        client_id - unique id assigned to each client, autoincrement
        client_name - full name of the client
        client_day - date of client appointment in MM/DD/YYYY format
        client_time - time range of client appointment
        client_order - the position of the client in the queue
        client_reason - the optional provided reason by client, can also contain the PRIORITY flag
        client_number - client's contact number
        client_code - client's auto-generated code
*/

clientsRouter.use(function (req, res, next) {  // define the headers the router uses
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

clientsRouter.get('/display/all',(req,res)=> { // displays all active client data
    connection.query('SELECT * FROM clients', function (err, rows, fields) { 
        if (err) throw err; // TODO: error handling
        res.json(rows); // send the results as a JSON body
    });
});

clientsRouter.get('/display/ids/:currentDate',(req,res)=>{ // get active client ids for the specified date
    const tempDate = req.params.currentDate; // get the current date passed as a parameter in the route
    const queryDate = moment(tempDate,'MMMM Do YYYY, dddd',true).format('MM/DD/YYYY'); // convert the date into the format of date in the database table to be queried
    connection.query('SELECT client_id FROM clients WHERE client_day = ?',queryDate,(err,rows,fields) => {
        if(err) throw err;
        res.json(rows);
    });
})

clientsRouter.get('/display/contactpairs/:currentDate',(req,res)=>{ // get objects containing ids and contact numbers of active clients for the specified date
    const tempDate = req.params.currentDate;
    const queryDate = moment(tempDate,'MMMM Do YYYY, dddd',true).format('MM/DD/YYYY');
    connection.query('SELECT client_id,client_number FROM clients where client_day = ?',queryDate,(err,rows,fields)=>{
        if(err) throw err;
        res.json(rows);
    });
})
// TODO: secure queries with hashed auth or headers
clientsRouter.delete( '/remove/:userIds' , (req,res,next) => { // deletes users with the passed ids
    const input = req.params.userIds.split(','); // separate the ids passed in the parameters
    const idArray = input.map( (id) => parseInt(id,10) ); // place ids of clients to be removed in an array
    connection.query( 'DELETE FROM clients WHERE client_id IN ?' , [[idArray]] , (err , rows , fields) => {
        if( err ) throw err;
        res.sendStatus(200); // send OK status when the process is completed successfully
    });
});

clientsRouter.get('/neworder/:userIds',(req,res)=>{ // get the new order for clients that have been moved from the reschedule table to the active clients table
    const userIds = req.params.userIds.split(',');
    const idArray = userIds.map((id)=>parseInt(id,10));
    connection.query('SELECT client_order,  FROM clients WHERE client_id IN ?' , [[idArray]],(err,rows,fields)=>{
        if(err) throw err;
        rows.json(rows);
    });
});
// TODO : standardize database date format
clientsRouter.post( '/transfer/:newDate/:newTime' , (req,res) => { // write to the active clients database for the specified date and time, executes when
    const newDate  = moment(req.params.newDate).format('MM/DD/YYYY'); // convert the recieved date parameter to the required format for the table to write on
    const newTime = req.params.newTime;
    var getOrderPromise = new Promise( (resolve,reject) => { // a promise that provides the new order of the client in his/her new queue
        connection.query(`SELECT MAX(client_order) AS final_order FROM clients WHERE client_day = '${newDate}' AND client_time = '${newTime}'`,(err,rows,fields) => {
            if( err ) {
                console.log(err);
                reject(err); // sends the error message instead upon error
            }
            if( rows[0].final_order == null )
                resolve( 0 ); // if the result is empty (because there are no clients for the date and time yet), assign the client as the first
            resolve( rows[0].final_order ); // get the first order number result
        });
    });
    getOrderPromise.then( (lastClientOrder) => { // executes after promise resolves
        var schedData = [];
        for( let index = 0 ; index < req.body.length ; index ++ ) { 
            const newClientOrder = parseInt(lastClientOrder) + index + 1; // set the starting client order for the array of clients
            schedData.push( [ req.body[index].userId , req.body[index].name , newDate , newTime , newClientOrder , req.body[index].reason , req.body[index].contactNumber, req.body[index].code ] ); // get the bulk of the data of the client to move from the JSON body sent by the client and push into a local variable array
        }
        // query string construction for easier readability
        const query = `
            INSERT INTO clients (
                client_id,
                client_name,
                client_day,
                client_time,
                client_order,
                client_reason,
                client_number,
                client_code
            )
            VALUES ?
        `;  
        connection.query( query , [schedData] , (err,rows,fields) => {
            if( err ) throw err;
            res.sendStatus(200);
        });
    }).catch((err) => {
        console.log( err );
        res.sendStatus(400); // sends the execution failed status when an error is encountered or when the promise to get new client order doesn't resolve
    });
});

clientsRouter.post( '/resched/transfer' , (req,res) => { // write to the reschedule clients table for the specified date and time, executes when 'cancelling' clients from the dashboard or through setting a day as unavailable
    var schedData = [];
    for( let index = 0 ; index < req.body.length ; index ++ ) {
        const bodyDate = moment(req.body[index].date).format('MM/DD/YYYY');
        schedData.push( [ req.body[index].userId , req.body[index].name , bodyDate , req.body[index].time , req.body[index].order , req.body[index].reason , req.body[index].contactNumber , req.body[index].code ] );
    }
    const query = `
        INSERT INTO reschedule_clients (
            client_id,
            client_name,
            client_day,
            client_time,
            client_order,
            client_reason,
            client_number,
            client_code
        )
        VALUES ?
    `;
    connection.query( query , [schedData] , (err,rows,fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});
// TODO: secure queries with hashed auth or headers
clientsRouter.delete( '/resched/remove/:array' , (req,res,next) => { // remove a set of specified client from the reschedule clients array
    const input = req.params.array.split(',');
    const idArray = input.map( (id) => parseInt(id,10) );
    console.log(`ids to remove: ${idArray}`);
    connection.query( 'DELETE FROM reschedule_clients WHERE client_id IN ?' , [[idArray]] , (err , rows , fields) => {
        if( err ) throw err;
        console.log(res);
        res.sendStatus(200);
    });
});

clientsRouter.post( '/sendmessage/custom/:contacts' , (req,res) => { // send custom message to specified contacts
    const customMessage = req.body.customMessage;
    const contactNos = req.params.contacts.split(',');
    contactNos.forEach( (contact) => {
        ox.addJob({
            body : { // adds a send job to the main server queue, details provided in queue-process.js
                type : 'SEND',
                flag : 'C',
                number : contact,
                message : customMessage
            }
        });
    });
    res.sendStatus(200);
});

clientsRouter.post( '/sendmessage/reschedule/complete/:contacts' , (req,res) => { // sends message to clients who have successfully been rescheduled
    const date = moment(req.body.date).format('MM/DD/YY');
    const time = req.body.time;
    const contactNos = req.params.contacts.split(',');
    const codes = req.body.codes;
    console.log( codes );
    for (let index = 0; index < contactNos.length; index++) {
        const parseTime = time.split('-'); // separates the time range into two separate time strings
        var timeComp = [];
        parseTime.forEach((time)=>{ // parse the time for the beginning and end time in the range
            const hour = parseInt(time.split(':')[0]);
            const minute = time.split(':')[1];
            timeComp.push(hour < 12 ? `${hour}:${minute}AM` : `${hour-12}:${minute}PM`); // changes 24-hour format to common AM-PM time convention
        });
        const timeString = `${timeComp[0]} to ${timeComp[1]}`; // saves the time to be displayed
        ox.addJob({
            body : { // sends a job to the main server queue, details in queue-process.js
                type : 'SEND',
                flag : 'R',
                number : contactNos[index],
                message : `${date}|${timeString}|${codes[index]}` // send the date, time and codes to the arduino to construct the message
            }
        });
        res.sendStatus(200);
    }
});

clientsRouter.post('/sendmessage/reschedule/cancel/:contacts',(req,res)=>{ // sends a message to clients whose appointments have been permanently cancelled
    const contactNos = req.params.contacts.split(',');
    contactNos.forEach((contact)=>{
        ox.addJob({ // sends a job to the main server queue, details in queue-process.js
            body : {
                type : 'SEND',
                flag : 'X',
                number : contact,
                message : ''
            }
        });
    });
    res.sendStatus(200);
});

clientsRouter.post('/sendmessage/reschedule/moved/:contacts' , (req,res)=> { // sends message to clients who have been 'canceled' and moved into the reschedule table
    const contactNos = req.params.contacts.split(',');
    contactNos.forEach((contact)=>{
        ox.addJob({ // sends a job to the main server queue, details in queue-process.js
            body : {
                type : 'SEND',
                flag : 'M',
                number : contact,
                message : ''
            }
        });
        res.sendStatus(200);
    });
});
// TODO: allow text querying for available days

module.exports = clientsRouter;