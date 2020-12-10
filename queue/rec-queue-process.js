const recQueue = require('./rec-queue-manager'); // module that handles queue processes
const sendQueue = require('./send-queue-manager'); // module that handles queue processes
var recWorkFn = require('./rec-work-function'); // module that contains the main body of queue process definitions
const applog = require('../utils/debug-log'); // custom log module that can be switched off when deploying
/*
  Serial header flag combinations: // to save memory, actions from the server are triggered by certain character headers from the device
  IB - Initialize Begin
  IW - Initialize Waiting
  IS - Initialize Success
  IF - Initialize Failed

  RR - Registrant Registration
  RC - Registrant Cancel
  RHELP* - Registrant HELP

  Queue job flag combinations: // Jobs are also given flags for standardization, the types of jobs and flags used are shown below
  REQUEST:
    <None>

  // the switch flow control is found in the Arduino. Flags are listed below just for reference
  SEND: 
    F - case for appointments are full, ask client to choose a new date
    T - case for appointment registration not happening 24 hours before intended date, ask client to choose a later one
    P - case for text having the wrong format
    M - case for client being 'canceled' and moved into the reschedule table
    H - case for sending the format when client queries HELP
    X - case for permanently cancelling appointment, ask client to register again
    S - case for successful appoitnment registration, send the client appointment details
    R - case for rescheduling successful, send the client new appointment details
    C - case for sending custom message
*/
// FIXME : queue not responding correctly
module.exports = function( data ) { // retrieves data from the arduino and starts processes based on text header
  var errors = [];
  const key = data;
  var initAttempts = 0;
  switch( key[0] ) { // handle different cases for different headers from arduino
    case 'I': // when the device initializes
      switch( key[1] ) { // determines follow up action based on second character
        case 'B': // when the device starts up
          applog.log('reciever device starting up...');
          break;
        case 'W': // when the device is waiting for response from the GSM
          applog.log( 'waiting reciever for device response...' );
          initAttempts ++;
          if( initAttempts > 3 ) { // abort boot and send message to system if there is no response
            // TODO: send message to system, abort boot
          }
          break;
        case 'S': // device started succesffuly // TODO : get input from other device for this feature
          applog.log( "the reciever device started sucessfully! Recieve Queue started..." );
          // start queue manager
          recQueue.process({
            work_fn : recWorkFn.work_fn, // define the function to run for the process
            concurrency : 1, // number of processes to run simultaneously, 1 means executing queue processes them one by one
            timeout : 60 // number of seconds before a queue process is aborted and considered failed
            // TODO: handle server timeout
          });
        case 'F': // when the device fails
          // TODO: error handling
          break;
        default:  
      }
      break;
    case 'R': // text from a registratant is recieved
      if( data.split(';')[2] == 'HELP' ) { // check for the HELP keyword and send appropriate text
        const contactNo = data.substring(2,data.length).split(';')[0]; // retrieve contact number for sending HELP message
        sendQueue.addJob({
          body : { // send a job server queue, explained above
            type : 'SEND',
            flag : 'H',
            number : contactNo,
            message : ''
          }
        });
        // do not break here!
      } 
      switch( key[1] ) { // determines follow up action based on second character
        case 'R' : // appointment registration recieved
          if( data.split(';').length < 3 ) { // check if the serial output is in the proper format // TODO: move to separate file
            errors.push( { type : 'ForbiddenCharError' , message : 'delimiter character frequency mismatch...' } );
          } else if( 1 > 5 ) {
            // TODO: protect against regex by using <special module>
          } else {
            var parsedMsg = data.substring(2,data.length).split(';'); // retrieves registration body from text
            applog.log("Message recieved in the queue process!!!");
            recQueue.addJob( { // adds the REGISTRATION task to queue
              body : {
                type : 'REQUEST',
                number : parsedMsg[0],
                date : parsedMsg[1],
                message : parsedMsg[2].trim()
              }
            });
          }
          break;
        case 'C':
          // TODO: handle cancel messages
          break;
      }
      break;
    default: // when there are no headers present
      errors.push( { type : 'BadPollingError' , message : 'command not recognized. please check input...' } );
  }
}