const applog = require('../utils/debug-log');
const moment = require('moment');
const { getAvailable } = require('./server-workers');
const workers = require('./server-workers');

var work_fn = async function (job_body) { // TODO: transfer function to another file
    var promise = new Promise(function(resolve, reject) {
        switch( job_body.type ) {
            case 'REGISTER':
                processRegistration( job_body );
                break;
            case 'SEND': // TODO: send function for success and failure
                break;
            default:
                // TODO: throw error
        }
        resolve();
    });
    // Do something with your job here
    return promise;
    // The job will be considered finished when the promise resolves,
    // or failed if the promise rejects.
}

var processRegistration = ( registration ) => {
    var msgParse = registration.message.split('-'); // split string based on the defined delimiter
    var stringDate = moment( msgParse[1] , 'MM/DD/YY' , true ).format("MMMM Do YYYY, dddd"); // TODO: add security check and accomodate single digit and four digit year
    var sendDate = moment( registration.date );
    var clientName = msgParse[0]; // get client name from message
    var clientReason = msgParse.length > 2 ? msgParse[2] : ''; // get client reason from message (if any)
    var contactNo = registration.number;

    workers.getAvailablePromise( stringDate , sendDate ).then( (targetSched) => { // TODO: add guard for repeated number and appointment date
        applog.log( 'targetSched from getAvailable' );
        // applog.log( targetSched );
        return workers.writeToSchedulePromise(targetSched);
    }).then( (targetSched ) => {
        applog.log( 'targetSched from writeToSchedule' );
        // applog.log( targetSched );
        return workers.getOrderPromise( targetSched );
    }).then(( orderSchedObj ) => {
        applog.log( 'orderSchedObj form getOrder' );
        // applog.log( orderSchedObj );
        return workers.writeToClientsPromise( clientName , msgParse[1] , orderSchedObj.sched.sched_time , orderSchedObj.order.sched_taken , clientReason , contactNo ); // TODO: change msgParse[1] to secured input once check feature complete
    }).then( ( queryRes ) => {
        applog.log( 'queryRes from writeToClients' );
        // applog.log( queryRes );
    }).catch( (err) =>{
        applog.log(err);   
    }).catch((err)=>{
        applog.log(err); // TODO: throw error
    }).catch((err) => {
        applog.log(err); // TODO: throw error
    }).catch((err)=>{
        applog.log(err);
    });
}

module.exports.work_fn = work_fn;