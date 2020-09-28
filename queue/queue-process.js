const ox = require('../utils/queue-manager');
const workFn = require('./work-function');
const applog = require('../utils/debug-log');

module.exports = function( data ) {
  var errors = [];
  const key = data.split( ';' );
  var initAttempts = 0;
  switch( key[0] ) {
    case 'INIT':
      if( key[1] == 'START' ) {
        applog.log('device starting up...');
      }
      else if( key[1] == 'WAITING' ) {
        applog.log( 'waiting for device response...' );
        initAttempts ++;
        if( initAttempts > 3 ) { // TODO: send message to system, abort boot
        }
      }
      else if( key[1] == 'SUCCESS' ) { // handle init success
        applog.log( "the device started sucessfully! Queue started..." );
        // start queue manager
        ox.process({
          work_fn : workFn.work_fn,
          concurrency : 1
        })
      }
      else { // handle init failure
        applog.log( "device failed. Throw error" ); // TODO: throw error
      }
      break;
    case 'SMSREC': // handle registration text received
      if( key.length != 4 ) { // check if the serial output is in the proper format
        errors.push( { type : 'ForbiddenCharError' , message : 'delimiter character frequency mismatch...' } );
      } else if( 1 > 5 ) {
        // TODO: protect against regex by using 
      } else {
        ox.addJob( { // adds the REGISTRATION task to queue
          body : {
            type : 'REQUEST',
            number : key[1],
            date : key[2],
            message : key[3]
          }
        });
      }
      break;
    case 'SEND_STATUS':
      if( key[1] == 'SUCCESS' ) { // handle send success
        applog.log( "message was successfully sent..." );
      }
      else if( key[1] == 'INIT' ) {
        applog.log( 'warming up SIM send...' );
      }
      else if( key[1] == 'WAITING' ) {
        applog.log( 'waiting for send...' );
      }
      else {
        applog.log( "message was not sent. Throw error" ); // TODO: throw error
      }
      break;
    default:
      applog.log('cannot understand input...'); // TODO: throw error
  }
}