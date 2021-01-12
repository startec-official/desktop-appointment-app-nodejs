var sendSerialConn = require('../connections/send-serial-connection'); // imported module for establishing serial connection with arduino, find actual code import in this file 
var serialFlag = require('../utils/global-event-emitter'); // a global flag for cross-file event firing and listening
var queueWorker = require('../workers/queue-workers');
var applog = require('../utils/debug-log');
var errors = [];

var sendMessage = ( sendBody ) => { // promise that sends signal to device to send a message to client
    return new Promise( (resolve,reject) => {
        const writeString = `${sendBody.flag}${sendBody.number};${sendBody.message}\n`; // construct the string to be sent to the device, contains the header, the contact number and the message body
        console.log( `message to write: ${writeString}` );
        sendSerialConn.write( writeString , function(err) { // function that sends data to the device
            if (err) {
                reject({ type : 'SerialCommError' , message : 'Cannot communicate to serial...' });
            }
            serialFlag.on( 'messageSent' , ( eventData ) => { // function upon recieving flag for the text being successfully sent, this flag was sent from the serial listener in queue-process.js
                serialFlag.removeAllListeners(["messageSent"]); // remove event listener upon completion
                resolve({ status : 'OK' , message : `Message send success, the message: ${sendBody.message} sent to the number ${sendBody.number}` }); // send success message
            });
            serialFlag.on( 'messageFailed' , (eventData) => {
                serialFlag.removeAllListeners(["messageFailed"]);
                // if( sendBody.times < 3 ) {
                //     queueWorker.sendPredefinedMessage( sendBody.type , sendBody.flag , sendBody.number , sendBody.times ++ ).then(
                //         (queryRes) => applog.log( queryRes ),
                //         (errorMessage) => errors.push(errorMessage)
                //     );
                //     resolve( { status : 'REATTEMPTING' , message : 'the message send failed. Reattempting to send...' } );
                // }
                // else {
                    reject({ error : 'sendFailedError' , message : `Check your SIM account balance or signal fidelity...` });   
                // }
            });
        });
    });
}

module.exports.sendMessage = sendMessage;