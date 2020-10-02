const { query } = require('express');
var express = require('express');
var clientsRouter = express.Router();
var connection = require('../connections/mysql-connection');
var moment = require('moment');
const { connect } = require('../connections/mysql-connection');

clientsRouter.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

clientsRouter.get('/displayAll',(req,res)=> {
    connection.query('SELECT * FROM clients', function (err, rows, fields) { 
        if (err) throw err
        res.json(rows);
    });
});

clientsRouter.delete( '/remove/:userIds' , (req,res,next) => { // TODO: secure queries with hashed auth or headers
    const input = req.params.userIds.split(',');
    const idArray = input.map( (id) => parseInt(id,10) );
    connection.query( 'DELETE FROM clients WHERE client_id IN ?' , [[idArray]] , (err , rows , fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

clientsRouter.post( '/transfer/:newDate/:newTime' , (req,res) => { // TODO : standardize database date format
    const newDate  = moment(req.params.newDate).format('MM/DD/YYYY');
    const newTime = req.params.newTime;
    console.log( `newDate : ${newDate} and newTime : ${newTime}` );
    console.log(newDate);
    var getOrderPromise = new Promise( (resolve,reject) => {
        connection.query(`SELECT MAX(client_order) AS final_order FROM clients WHERE client_day = '${newDate}' AND client_time = '${newTime}'`,(err,rows,fields) => {
            if( err ) {
                console.log(err);
                reject(err);
            }
            if( rows[0].final_order == null )
                resolve( 0 ); // if empty result, assign as the first
            resolve( rows[0].final_order ); // get first result
        });
    });
    getOrderPromise.then( (lastClientOrder) => {
        console.log( lastClientOrder );
        var schedData = [];
        for( let index = 0 ; index < req.body.length ; index ++ ) {
            const newClientOrder = parseInt(lastClientOrder) + index + 1;
            schedData.push( [ req.body[index].userId , req.body[index].name , newDate , newTime , newClientOrder , req.body[index].reason , req.body[index].contactNumber ] );
        }
        const query = `
            INSERT INTO clients (
                client_id,
                client_name,
                client_day,
                client_time,
                client_order,
                client_reason,
                client_number
            )
            VALUES ?
        `;
        console.log( schedData );
        connection.query( query , [schedData] , (err,rows,fields) => {
            if( err ) throw err;
            res.sendStatus(200);
        });
    }).catch((err) => {
        console.log( err );
        res.sendStatus(400);
    });
});

clientsRouter.post( '/resched/transfer' , (req,res) => {
    var schedData = [];
    for( let index = 0 ; index < req.body.length ; index ++ ) {	 	 	
        const bodyDate = moment(req.body[index].date).format('MM/DD/YYYY');
        schedData.push( [ req.body[index].userId , req.body[index].name , bodyDate , req.body[index].time , req.body[index].order , req.body[index].reason , req.body[index].contactNumber ] );
    }
    const query = `
        INSERT INTO reschedule_clients (
            client_id,
            client_name,
            client_day,
            client_time,
            client_order,
            client_reason,
            client_number
        )
        VALUES ?
    `;
    console.log( schedData );
    connection.query( query , [schedData] , (err,rows,fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

clientsRouter.delete( '/resched/remove/:array' , (req,res,next) => { // TODO: secure queries with hashed auth or headers
    const input = req.params.array.split(',');
    const idArray = input.map( (id) => parseInt(id,10) );
    connection.query( 'DELETE FROM reschedule_clients WHERE client_id IN ?' , [[idArray]] , (err , rows , fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

// TODO: send text messsage to all rescheduled clients
// TODO: allow text querying for available days
// TODO: send text about new schedule
// TODO: 

// TODO: manage arduino memory

module.exports = clientsRouter;