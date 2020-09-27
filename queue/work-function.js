const applog = require('../utils/debug-log');
const moment = require('moment');
const { getAvailable } = require('../workers/server-workers');
const workers = require('../workers/server-workers');

var work_fn = async function (job_body) { // TODO: transfer function to another file
    var promise = new Promise(function(resolve, reject) {
        console.log( job_body );
        switch( job_body.type ) {
            case 'REGISTER':
                processRegistration( job_body );
                break;
            case 'SEND': // TODO: send function for success and failure
                break;
            default:
                // throw error
        }
        resolve();
    });
    // Do something with your job here
    return promise;
    // The job will be considered finished when the promise resolves,
    // or failed if the promise rejects.
}

var processRegistration = ( registration ) => {
    var stringDate = moment( registration.date , true ).format("MMMM Do YYYY, dddd");
    workers.getAvailablePromise( stringDate ).then( (sched) => {
        applog.log( sched );
        return workers.writeToSchedulePromise(sched);
    }).then( (status) => {
        applog.log( status );
    }).catch((err)=>{
        applog.log(err);
    }).catch((err) => {
        applog.log(err);
    });
}

module.exports.work_fn = work_fn;