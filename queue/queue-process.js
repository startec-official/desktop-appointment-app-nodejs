const ox = require('../utils/queue-manager');
const workFn = require('./work-function');
const applog = require('../utils/debug-log');

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
          work_fn : workFn.work_fn,
          concurrency : 1
        })
      }
      else { // handle init failure
        applog.log( "device failed. Throw error" ); // TODO: throw error
        initAttempts ++;
        if( initAttempts > 3 ) { // send message to system, abort boot

        }
      }
      break;
    case 'KEYWORD': // handle registration text received
      ox.addJob( { 
        body : {
          type : 'REGISTER',
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
      else {
        applog.log( "message was not sent. Throw error" ); // TODO: throw error
      }
      break;
    default:
      applog.log('cannot understand input...'); // TODO: throw error
  }
}