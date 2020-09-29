const applog = require('../utils/debug-log');
const serverWorker = require('../workers/server-workers');
const serialWorker = require('../workers/serial-workers');
const ox = require('../utils/queue-manager');

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
        var regData , targetSched,orderData;
        var errors = [];

        serverWorker.verifyInputPromise( registrationBody ).then( (resRegData) => { // TODO: secure table polling against cross-site scripting
            regData = resRegData;
            return serverWorker.getAvailableSchedulesPromise( regData.contactNumber , regData.dateFromMsgFrmtd );
        }).then( ( resTargetSched ) => { // TODO: add guard for repeated number and appointment date
            targetSched = resTargetSched;
            return serverWorker.writeToSchedulePromise(targetSched);
        }).then( ( queryRes ) => {
            applog.log( queryRes.message );
            return serverWorker.getClientOrderPromise( targetSched );
        }).then(( order ) => {
            orderData = { // assign order information to object for easier readability
                order  : order.sched_taken,
                slots : order.sched_slots
            }
            return serverWorker.writeToClientsTablePromise( regData.clientName , regData.dateFromMsg.format('MM/DD/YYYY') , targetSched.sched_time , orderData.order , regData.clientReason , regData.contactNumber ); // TODO: change msgParse[1] to secured input once check feature complete
        }).then((queryRes) => {
            ox.addJob({ // send registration successful message to queue
                body : {
                    type : 'SEND',
                    flag : 'S',
                    number : regData.contactNumber,
                    message : `${regData.dateFromMsg.format('MM/DD/YY')}, ${targetSched.sched_time}!abc1,${orderData.order}/${orderData.slots}`
                }
            });
            return queryRes;
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

        serialWorker.sendMessage( sendBody ).then( (queryRes) => {
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