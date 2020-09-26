const ox = require('./utils/queue-manager');
const applog = require('./utils/debug-log');

module.exports = function( data ) {
    const key = data.split( ';' );
  var initAttempts = 0;
  switch( key[0] ) {
    case 'INIT':
      if( key[1] == 'START' ) {
        // handle device startup
      }
      else if( key[1] == 'SUCCESS' ) { // handle init success
        applog.log( "the device started sucessfully!" );
        // queue manager code
        ox.process({
          work_fn : async function (job_body) { // TODO: transfer function to another file
            var promise = new Promise(function(resolve, reject) {
              applog.log( job_body );
              resolve();
            });             
            // Do something with your job here
            return promise;
            // The job will be considered finished when the promise resolves,
            // or failed if the promise rejects.
          },
          concurrency : 1
        })
      }
      else { // handle init failure
        applog.log( "device failed. Throw error" );
        initAttempts ++;
        if( initAttempts > 3 ) { // send message to system, abort boot

        }
      }
      break;
    case 'KEYWORD': // handle registration text received
      ox.addJob( { 
        body : {
          number : key[1],
          date : key[2],
          message : key[3]
        }
      });
      break;
    case 'SEND_STATUS':
      if( key[1] == 'SUCCESS' ) { // handle send success
        applog.log( "message was successfully sent..." );
      }
      else { // handle error
        applog.log( "message was not sent. Throw error" );
      }
      break;
    default:
      applog.log('cannot understand input...');
  }
}