const conn = require('../connections/mysql-connection');

var getAvailable = function( date ) {
    var query = 'SELECT sched_date, sched_time FROM schedule WHERE ( sched_taken < sched_slots AND sched_date = ?)';
    conn.query( query, date , (err,rows,fields) => {
        if( err ) throw err;
        return rows; // choose topmost result
    });
}

var getAvailablePromise = (date) => {
    return new Promise((resolve,reject) => {
        var query = 'SELECT sched_date, sched_time FROM schedule WHERE ( sched_taken < sched_slots AND sched_date = ?)';
        conn.query( query, date , (err,rows,fields) => {
            if( err ) reject( err );
            resolve( rows[0] ); // choose topmost result
        });
    });
};

var writeToSchedulePromise = function( input ) {
    return new Promise(function(resolve, reject) {
        var query = `UPDATE schedule SET sched_taken = sched_taken + 1 WHERE sched_date = '${input.sched_date}' AND sched_time = '${input.sched_time}'`;
        console.log( input );
        conn.query( query , (err,rows,fields) => {
            if(err) reject(err);
            resolve( rows );
        });
    });
}

module.exports.getAvailable = getAvailable;
module.exports.getAvailablePromise = getAvailablePromise;
module.exports.writeToSchedulePromise = writeToSchedulePromise;