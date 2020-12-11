var sendSerialConn = require('../connections/send-serial-connection'); // imported module for establishing serial connection with arduino, find actual code import in this file 
var serialFlag = require('../utils/global-event-emitter'); // a global flag for cross-file event firing and listening

var sendMessage = ( sendBody ) => { // promise that sends signal to device to send a message to client
    return new Promise( (resolve,reject) => {
        const writeString = `${sendBody.flag}${sendBody.number};${sendBody.message}\n`; // construct the string to be sent to the device, contains the header, the contact number and the message body
        console.log( sendBody.message );
        sendSerialConn.write( writeString , function(err) { // function that sends data to the device
            if (err) {
                reject({ type : 'SerialCommError' , message : 'Cannot communicate to serial...' });
            }
            serialFlag.on( 'messageSent' , ( eventData ) => { // function upon recieving flag for the text being successfully sent, this flag was sent from the serial listener in queue-process.js
                serialFlag.removeAllListeners(["messageSent"]); // remove event listener upon completion
                resolve({ status : 'OK' , message : `Message send success, the message: ${sendBody.message} sent to the number ${sendBody.number}` }); // send success message
            });
        });
    });
}

module.exports.sendMessage = sendMessage;