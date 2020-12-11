var conn = require('../connections/mysql-connection'); // module that allows connecting to a mysql database
var moment = require('moment'); // handly module for working with dates and times
var queueWorker = require('../workers/queue-workers'); // module containing functions for handling queue operations
var crypto = require('../utils/crypto'); // module for generating random string


var ignoreSpamPromise = ( data ) => { // UPGRADE : better spam protection // TODO: protect against regex by using <special module>
    return new Promise((resolve,reject) => { 
        if( data.split(';').length < 3 ) { // check if the serial output is in the proper format // TODO: move to verify input
            reject( { type : 'ForbiddenCharError' , message : 'delimiter character frequency mismatch...' } );
        }
        else {
            resolve( { status : 'OK' , message : 'message is in proper format. Not spam...' } );
        }
    });
}

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
            errors.push( { type : 'ParseError' , message : 'Error parsing text message...' } ); // push the error message to the array of errors
        }
        var dateFromMsgStr = '';
        try {
            var dateFromMsgRaw = msgParse[1]; // gets the appointment date from the message body
            var parseString = dateFromMsgRaw.split('/');
            // the next line fixes the input if in single digits // TODO: fix other common mistakes
            dateFromMsgStr = `${ parseString[0].length == 2 ? parseString[0] : `0${parseString[0]}` }/${ parseString[1].length == 2 ? parseString[1] : `0${parseString[1]}` }/${ parseString[2].length == 2 ? parseString[2] : parseString[2].substring(2,4) }`;
        } catch( e ) {
            errors.push( { type : 'ParseError' , message : 'Error parsing the input date...' } );
        }
        var dateFromMsg = moment( dateFromMsgStr , 'MM/DD/YY' , true ); // convert the date into a Moment object for easier handling
        // check for element validity
        //TODO: add cross-site scripting check or SANITIZE the input
        if( msgParse.length < 2 || msgParse.length > 3 ) { // check if the message contains required number of string elements for format
            errors.push({ type : 'ParseError' , message : 'message does not contain required number of elements...' });
        }
        if( !dateFromMsg.isValid() ) { // check if the date is valid
            errors.push({ type : 'ParseError' , message : 'Cannot parse the given input date...' });
        }
        // check for date validity OR one day before rule check
        if( dateRec.isAfter( dateFromMsg.clone().subtract(1,'days') ) ) {
            errors.push( { type : 'TimingError' , message : 'you must sign up one day before the desired appointment...' } );
        }

        if( errors.length > 0 ) { // signal errors when present in the array
            if( errors.filter((error) => error.type === 'ParseError').length > 0 ) {
                queueWorker.sendPredefinedMessage( 'SEND' , 'P' , contactNo , '' ).then( // send a wrong format message, adds a send job to the main server queue, details provided in queue-process.js
                    ( queryStatus ) => applog.log( queryStatus ),
                    ( errorMessage ) => errors.push( errorMessage ));
            }
            if( errors.filter((error) => error.type === 'TimingError').length > 0 ) {
                queueWorker.sendPredefinedMessage( 'SEND' , 'T' , contactNo , '' ).then( // send a timing error message, adds a send job to the main server queue, details provided in queue-process.js
                    ( queryStatus ) => applog.log( queryStatus ),
                    ( errorMessage ) => errors.push( errorMessage ));
            }
            reject( errors );
        }
        else {
            // get formatted data once prelim checks are done
            var dateFromMsgFrmtd = dateFromMsg.format("MMMM Do YYYY, dddd"); // TODO: add security check and accomodate single digit and four digit year
            var clientName = msgParse[0];
            var clientReason = msgParse.length > 2 ? msgParse[2] : ''; // get client reason from message (if any)
            var clientCode = crypto.generateRandomCode(4); // generate client unique random client code
            // place all registration data into one object for convenience
            var regData = { // body of verified message
                dateRecieved : dateRec,
                contactNumber : contactNo,
                dateFromMsg : dateFromMsg,
                dateFromMsgFrmtd : dateFromMsgFrmtd,
                clientName : clientName,
                clientReason : clientReason,
                clientCode : clientCode
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
                queueWorker.sendPredefinedMessage( 'SEND' , 'F' , contactNo , '' ).then( 
                    ( queryStatus ) => applog.log( queryStatus ),
                    ( errorMessage ) => errors.push( errorMessage ));
                reject( { type : 'TimingError' , message : 'no available slots for selected date...' } );
            } else {
                resolve( rows[0] ); // choose topmost result
            }
        });
    });
};

var writeToSchedulePromise = ( targetSched ) => { // function that increments the number of slots taken in the schedule table for the specified date and time
    return new Promise((resolve, reject) => {
        var query = `UPDATE schedule SET sched_taken = sched_taken + 1 WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } ); // TODO: SECURE payload here
            resolve( { status : 'OK' , message : 'sucessfully updated schedule table...' } ); // send success message
        });
    });
}

var getClientOrderPromise = ( targetSched ) => { // gets the position of the client to be registered in the queue
    return new Promise((resolve, reject) => {
        var query = `SELECT sched_taken,sched_slots FROM schedule WHERE sched_date = '${targetSched.sched_date}' AND sched_time = '${targetSched.sched_time}'`;
        conn.query( query , (err,rows,fields) => {
            if(err) reject( { type : 'SQLError' , message : 'There was an error connecting with the database...' } );
            resolve( rows[0] ); // take the only result from the list, send an pair object of current order (rows[0].sched_taken) and total number of slots (rows[0].sched_slots)
        });
    });
}

var writeToClientsTablePromise = ( clientName , clientDate, clientTime , clientOrder , clientReason , clientNumber , clientCode ) => {
    return new Promise( (resolve,reject) => {
        var query = `INSERT INTO clients (client_name, client_day, client_time, client_order, client_reason, client_number, client_code) VALUES
        ('${clientName}', '${clientDate}', '${clientTime}', ${clientOrder}, '${clientReason}', '${clientNumber}','${clientCode}');`; // TODO: secure payload here as well
        conn.query( query , (err,rows,fields) => {
            if( err ) reject( { type : 'SQLError' , message : 'There was an error connecting with the database' } ); // TODO: error handling
            resolve( { status : 'OK' , message : 'written to client and schedule db...' } );
        });
    });
}

var getSendToQueuePromise = (targetSched , regData , orderData ) => {
    return new Promise( (resolve , reject) => {
        try {
            const parseTime = targetSched.sched_time.split('-');
            var timeComp = [];
            parseTime.forEach((time)=>{ // parse the time
                const hour = parseInt(time.split(':')[0]);
                const minute = time.split(':')[1];
                timeComp.push(hour < 12 ? `${hour}:${minute}AM` : `${hour-12}:${minute}PM`);  // convert time to AM-PM convention
            });
            const timeString = `${timeComp[0]} to ${timeComp[1]}`;
            var constructedRegistrationBody = `${regData.dateFromMsg.format('MM/DD/YY')}|${timeString}|${regData.clientCode}|${orderData.order}/${orderData.slots}`; // send the client's appointment date, time, code and position in the queue
            queueWorker.sendPredefinedMessage( 'SEND' , 'S' , regData.contactNo , constructedRegistrationBody ).then( 
                ( queryStatus ) => applog.log( queryStatus ),
                ( errorMessage ) => errors.push( errorMessage ));
            resolve( { status : 'OK' , message : 'registration job successfully added to queue...' } );
        }
        catch(e) {
            reject( { error : 'AddToQueueError' , message : 'there was an error adding job to queue...' } ); // TODO: error handling
        }
    });
}

module.exports.ignoreSpam = ignoreSpamPromise;
module.exports.verifyInputPromise = verifyInputPromise;
module.exports.getAvailableSchedulesPromise = getAvailableSchedulesPromise;
module.exports.writeToSchedulePromise = writeToSchedulePromise;
module.exports.getClientOrderPromise = getClientOrderPromise;
module.exports.sendToQueuePromise = getSendToQueuePromise;
module.exports.writeToClientsTablePromise = writeToClientsTablePromise;