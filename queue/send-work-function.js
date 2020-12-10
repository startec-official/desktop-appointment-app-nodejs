const applog = require('../utils/debug-log'); // custom log module that can be switched off when deploying
const serialWorker = require('../workers/serial-workers'); // module that handles interactions with the device via serial

var work_fn = async function (job_body) { // function containing bulk of the code for the queue process
    var promise = new Promise(function(resolve, reject) {
        switch( job_body.type ) { // handle job based on sent type flag
            case 'SEND': // TODO: send function for success and failure // for sending a message to client
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
    return promise;
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