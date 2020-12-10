const applog = require('../utils/debug-log'); // custom log module that can be switched off when deploying
const serverWorker = require('../workers/server-workers'); // module that handles internal server processes

var work_fn = async function (job_body) { // function containing bulk of the code for the queue process
    var promise = new Promise(function(resolve, reject) {
        switch( job_body.type ) { // handle job based on sent type flag
            case 'REQUEST': // for requesting appointment registration
                processRegistration( job_body ).then((queryRes) => {
                    resolve( queryRes );
                }).catch( ( errors ) => {
                    reject( errors );
                }); // TODO: add unique ID generation feature, and table column
                break;
            default:
                // TODO: throw error
        }
    });
    return promise;
}

var processRegistration = ( registrationBody ) => { // function for handling appointment registration
    return new Promise( (topRes , topRej) => {
        var regData; // holds the client information
        var targetSched; // holds the target schedule information
        var orderData; // holds retrieved position of client in queue
        var errors = []; // holds errors encountered by function
            
        serverWorker.verifyInputPromise( registrationBody ).then( (resRegData) => { // verifies the input before proceeding to registration
            regData = resRegData;        // TODO: secure table polling against cross-site scripting
            return serverWorker.getAvailableSchedulesPromise( regData.contactNumber , regData.dateFromMsgFrmtd );
            // TODO: add guard for repeated number and appointment date
        }).then( ( resTargetSched ) => { // writes the data to the schedule
            targetSched = resTargetSched;
            return serverWorker.writeToSchedulePromise(targetSched);
        }).then( ( queryRes ) => { // gets the new order / position in the queue for the client
            applog.log( queryRes.message );
            return serverWorker.getClientOrderPromise( targetSched );
        }).then(( order ) => {
            orderData = { // assign order information to object for easier readability
                order  : order.sched_taken,
                slots : order.sched_slots
            }
            return serverWorker.writeToClientsTablePromise( regData.clientName , regData.dateFromMsg.format('MM/DD/YYYY') , targetSched.sched_time , orderData.order , regData.clientReason , regData.contactNumber , regData.clientCode ); // TODO: change msgParse[1] to secured input once check feature complete
        }).then((queryRes) => { // send signal to server to send registration success message
            return serverWorker.sendToQueuePromise( targetSched , regData , orderData );
        }).then( ( queryRes ) => {
            applog.log( queryRes.message );
            topRes( queryRes );
        }).catch( (err) => {
            errors.push( err ); // TODO: error handling
            applog.log( errors );
            topRej( errors );
        });
    });
}

module.exports.work_fn = work_fn;