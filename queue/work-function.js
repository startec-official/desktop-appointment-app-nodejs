const applog = require('../utils/debug-log');
const moment = require('moment');
const workers = require('./server-workers');

var work_fn = async function (job_body) {
    var promise = new Promise(function(resolve, reject) {
        switch( job_body.type ) {
            case 'REQUEST':
                processRegistration( job_body ).then((queryRes) => {
                    resolve( queryRes );
                }).catch( ( errors ) => {
                    reject( errors );
                }); // TODO: add unique ID generation feature, and table column
                break;
            case 'SEND': // TODO: send function for success and failure
                sendMessage( job_body ).then( (queryRes) => {
                    resolve(queryRes);
                }).catch((errors)=>{
                    reject( errors );
                });
                break;
            default:
                // TODO: throw error
        }
    });
    // Do something with your job here
    return promise;
    // The job will be considered finished when the promise resolves,
    // or failed if the promise rejects.
}

var processRegistration = ( registrationBody ) => {
    return new Promise( (topRes , topRej) => {
        var regData , targetSched;
        var errors = [];
        // TODO: documentation
        // var regData = { // body of verified message 
        //     dateRecieved : dateRec,
        //     contactNumber : contactNo,
        //     dateFromMsg : dateFromMsg,
        //     dateFromMsgFrmtd : dateFromMsgFrmtd,
        //     clientName : clientName,
        //     clientReason : clientReason
        // }

        workers.verifyInputPromise( registrationBody ).then( (resRegData) => { // TODO: secure table polling against cross-site scripting
            regData = resRegData;
            return workers.getAvailablePromise( regData.contactNumber , regData.dateFromMsgFrmtd );
        }).then( ( resTargetSched ) => { // TODO: add guard for repeated number and appointment date
            targetSched = resTargetSched;
            return workers.writeToSchedulePromise(targetSched);
        }).then( ( queryRes ) => {
            applog.log( queryRes.message );
            return workers.getOrderPromise( targetSched );
        }).then(( order ) => {
            return workers.writeToClientsPromise( regData.clientName , regData.dateFromMsg.format('MM/DD/YY') , targetSched.sched_time , order , regData.clientReason , regData.contactNumber ); // TODO: change msgParse[1] to secured input once check feature complete
        }).then( ( queryRes ) => {
            applog.log( queryRes.message );
            topRes( queryRes );
        }).catch( (err) => {
            errors.push( err );
            applog.log( errors );
            topRej( errors );
        });
    });
}

var sendMessage = ( sendBody ) => {
    return new Promise((topRes,topRej)=> {
        var errors = [];
        // TODO: If flag not resolved, reject the queue entry, replace

        workers.sendMessage( sendBody ).then( (queryRes) => {
            applog.log( queryRes.message );
            topRes( queryRes );
        }).catch( (err) => {
            errors.push( err );
            applog.log( errors );
            topRej(errors);
        });
    });
}

module.exports.work_fn = work_fn;