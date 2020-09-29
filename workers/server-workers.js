const conn = require('../connections/mysql-connection');
const moment = require('moment');
const ox = require('../utils/queue-manager');

// TODO: place all query requests into one file

var verifyInputPromise = ( registrationBody ) => { // checks if the input is correct
    return new Promise((resolve,reject) => {
        // init array of errors
        var errors = [];
        // get message received params
        var dateRec = moment( registrationBody.date.split('+')[0].split(',')[0] , 'YY/MM/DD' ,true); // TODO: set deadline time for registration
        var contactNo = registrationBody.number;
        // get message info
        try {
            var msgParse = registrationBody.message.split('-'); // split string based on the defined delimiter
            msgParse.forEach( (msgPart) => msgPart = msgPart.trim() ); // remove whitespace in between dashes
            msgParse[0] = msgParse[0].toUpperCase(); // set the first part of the message (name) to ALL CAPS
            msgParse[1] = msgParse[1].replace(/ +/g, ""); // remove all whitespace from the date input to concur to format
        } catch( e ) {
            errors.push( { type : 'ParseError' , message : 'Error parsing text message...' } );
        }
        var dateFromMsgStr = '';
        try {
            var dateFromMsgRaw = msgParse[1];
            var parseString = dateFromMsgRaw.split('/');
            // the next line fixes the input if in single digits // TODO: fix other common mistakes
            dateFromMsgStr = `${ parseString[0].length == 2 ? parseString[0] : `0${parseString[0]}` }/${ parseString[1].length == 2 ? parseString[1] : `0${parseString[1]}` }/${ parseString[2].length == 2 ? parseString[2] : parseString[2].substring(2,4) }`;
        } catch( e ) {
            errors.push( { type : 'ParseError' , message : 'Error parsing the input date...' } );
        }
        var dateFromMsg = moment( dateFromMsgStr , 'MM/DD/YY' , true );
        // check for element validity
        //TODO: add cross-site scripting check or SANITIZE the input
        if( msgParse.length < 2 || msgParse.length > 3 ) { // check if the message contains required number of string elements for format
            errors.push({ type : 'ParseError' , message : 'message does not contain required number of elements...' });
        }
        if( !dateFromMsg.isValid() ) {
            errors.push({ type : 'ParseError' , message : 'Cannot parse the given input date...' });
        }
        // check for date validity OR one day before rule check
        if( dateRec.isAfter( dateFromMsg.clone().subtract(1,'days') ) ) {
            errors.push( { type : 'TimingError' , message : 'you must sign up one day before the desired appointment...' } );
        }

        if( errors.length > 0 ) {
            if( errors.filter((error) => error.type === 'ParseError').length > 0 ) {
                ox.addJob({
                    body : {
                        type : 'SEND',
                        flag : 'P',
                        number : contactNo,
                        message : ''
                    }
                });
            }
            if( errors.filter((error) => error.type === 'TimingError').length > 0 ) {
                ox.addJob({
                    body : {
                        type : 'SEND',
                        flag : 'T',
                        number : contactNo,
                        message : ''
                    }
                });
            }
            reject( errors );
        }
        else {
            // get formatted data once prelim checks are done
            var dateFromMsgFrmtd = dateFromMsg.format("MMMM Do YYYY, dddd"); // TODO: add security check and accomodate single digit and four digit year
            var clientName = msgParse[0];
            var clientReason = msgParse.length > 2 ? msgParse[2] : ''; // get client reason from message (if any)
            // place all registration data into one object for convenience
            var regData = { // body of verified message
                dateRecieved : dateRec,
                contactNumber : contactNo,
                dateFromMsg : dateFromMsg,
                dateFromMsgFrmtd : dateFromMsgFrmtd,
                clientName : clientName,
                clientReason : clientReason
            }
            resolve( regData );
        }
    });
}

var getAvailableSchedulesPromise = ( contactNo , targetDate ) => { // polls db to check if the requested date is available
    return new Promise((resolve,reject) => {
        var query = 'SELECT sched_date, sched_time FROM schedule WHERE ( sched_taken < sched_slots AND sched_date = ?)';
        conn.query( query, targetDate , (err,rows,fields) => {
            if( err ) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } );
            if( rows.length == 0 ) {
                ox.addJob( { // add a job to send client a text about the error
                    body: {
                        type : 'SEND',
                        flag : 'F',
                        number : contactNo,
                        message : ''
                    }
                });
                reject( { type : 'TimingError' , message : 'no available slots for selected date...' } );
            } else {
                resolve( rows[0] ); // choose topmost result
            }
        });
    });
};

var writeToSchedulePromise = ( targetSched ) => { 
    return new Promise((resolve, reject) => {
        var query = `UPDATE schedule SET sched_taken = sched_taken + 1 WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } ); // TODO: SECURE payload here
            resolve( { status : 'OK' , message : 'sucessfully updated schedule table...' } );
        });
    });
}

var getClientOrderPromise = ( targetSched ) => {
    return new Promise((resolve, reject) => {
        var query = `SELECT sched_taken,sched_slots FROM schedule WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } );
            resolve( rows[0] ); // take the only result from the list, send an pair object of current order (rows[0].sched_taken) and total number of slots (rows[0].sched_slots)
        });
    });
}

var writeToClientsTablePromise = ( clientName , clientDate, clientTime , clientOrder , clientReason , clientNumber ) => {
    return new Promise( (resolve,reject) => {
        var query = `INSERT INTO clients (client_name, client_day, client_time, client_order, client_reason, client_number) VALUES
        ('${clientName}', '${clientDate}', '${clientTime}', ${clientOrder}, '${clientReason}', '${clientNumber}');`; // TODO: secure payload here as well
        conn.query( query , (err,rows,fields) => {
            if( err ) reject( { type : 'SQLError' , message : 'There was an error connecting with the database' } ); // TODO: error handling
            resolve( { status : 'OK' , message : 'written to client and schedule db...' } );
        });
    });
}

module.exports.verifyInputPromise = verifyInputPromise;
module.exports.getAvailableSchedulesPromise = getAvailableSchedulesPromise;
module.exports.writeToSchedulePromise = writeToSchedulePromise;
module.exports.getClientOrderPromise = getClientOrderPromise;
module.exports.writeToClientsTablePromise = writeToClientsTablePromise;