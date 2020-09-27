const conn = require('../connections/mysql-connection');
const moment = require('moment');

var getAvailablePromise = (date , sendDate) => {
    return new Promise((resolve,reject) => {
        if( moment(date,'MM/DD/YY',true).isAfter( moment(sendDate).subtract(1,'days') ) ) {
            reject( { type : 'TimingError' , message : 'you must sign up one day before the desired appointment' } ); // TODO: error handling
        }
        else {
            var query = 'SELECT sched_date, sched_time FROM schedule WHERE ( sched_taken < sched_slots AND sched_date = ?)';
            conn.query( query, date , (err,rows,fields) => {
                if( err ) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } ); // TODO: error handling
                // TODO: hook for when no schedule is available here
                resolve( rows[0] ); // choose topmost result
            });   
        }
    });
};

var writeToSchedulePromise = ( targetSched ) => {
    return new Promise((resolve, reject) => {
        var query = `UPDATE schedule SET sched_taken = sched_taken + 1 WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject(err);
            resolve(targetSched);
        });
    });
}

var getOrderPromise = ( targetSched ) => {
    return new Promise((resolve, reject) => {
        var query = `SELECT sched_taken FROM schedule WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject(err);
            resolve({ order : rows[0] , sched : targetSched }); // take the only result from the list
        });
    });
}

var writeToClientsPromise = ( clientName , clientDate, clientTime , clientOrder , clientReason , clientNumber ) => {
    return new Promise( (resolve,reject) => {
        var query = `INSERT INTO clients (client_name, client_day, client_time, client_order, client_reason, client_number) VALUES
        ('${clientName}', '${clientDate}', '${clientTime}', ${clientOrder}, '${clientReason}', '${clientNumber}');`;
        conn.query( query , (err,rows,fields) => {
            if( err ) reject( err ); // TODO: error handling
            resolve( rows );
        });
    });
}
module.exports.getAvailablePromise = getAvailablePromise;
module.exports.writeToSchedulePromise = writeToSchedulePromise;
module.exports.getOrderPromise = getOrderPromise;
module.exports.writeToClientsPromise = writeToClientsPromise;