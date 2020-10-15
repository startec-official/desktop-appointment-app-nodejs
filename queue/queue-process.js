const ox = require('../utils/queue-manager');
const workFn = require('./work-function');
const applog = require('../utils/debug-log');
var serialFlag = require('../utils/global-event-emitter');

module.exports = function( data ) {
  var errors = [];
  const key = data;
  var initAttempts = 0;
  switch( key[0] ) {
    case 'I':
      switch( key[1] ) {
        case 'B':
          applog.log('device starting up...');
          break;
        case 'W':
          applog.log( 'waiting for device response...' );
          initAttempts ++;
          if( initAttempts > 3 ) { 
            // TODO: send message to system, abort boot
          }
          break;
        case 'S':
          applog.log( "the device started sucessfully! Queue started..." );
          // start queue manager
          ox.process({
            work_fn : workFn.work_fn,
            concurrency : 1,
            timeout : 20
          });
          break;
        case 'F':
          break;
        default:  
      }
      break;
    case 'R': // handle registration text received
      if( data.split(';')[2] == 'HELP' ) {
        const contactNo = data.substring(2,data.length).split(';')[0];
        ox.addJob({
          body : {
            type : 'SEND',
            flag : 'H',
            number : contactNo,
            message : ''
          }
        });
        break;
      } 
      switch( key[1] ) {
        case 'R' :
          if( data.split(';').length < 3 ) { // check if the serial output is in the proper format
            errors.push( { type : 'ForbiddenCharError' , message : 'delimiter character frequency mismatch...' } );
          } else if( 1 > 5 ) {
            // TODO: protect against regex by using 
          } else {
            var parsedMsg = data.substring(2,data.length).split(';');
            ox.addJob( { // adds the REGISTRATION task to queue
              body : {
                type : 'REQUEST',
                number : parsedMsg[0],
                date : parsedMsg[1],
                message : parsedMsg[2]
              }
            });
          }
          break;
        case 'C':
          // TODO: handle cancel messages
          break;
      }
      break;
    case 'S':
      switch( key[1] ) {
        case 'S':
          applog.log( "message was successfully sent..." );
          serialFlag.emit( 'messageSent' , 'you managed to do it!' );
          break;
        case 'I':
          applog.log( 'warming up SIM send...' );
          break;
        case 'W':
          applog.log( 'waiting for send...' );
          break;
        case 'F':
          serialFlag.emit( 'messageSent' , 'you managed to do it!' );
          // TODO: send the message back to queue to retry, add occurence count
          break;
        default:
          errors.push( { type : 'BadPollingError' , message : 'command not recognized. please check input...' } );
      }
      break;
    default:
      // applog.log('cannot understand input...');
      errors.push( { type : 'BadPollingError' , message : 'command not recognized. please check input...' } );
  }
}