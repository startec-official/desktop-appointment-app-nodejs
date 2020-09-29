const port = require('../connections/serial-connection');
var serialFlag = require('../utils/global-event-emitter');

var sendMessage = ( sendBody ) => {
    return new Promise( (resolve,reject) => {
        const writeString = `${sendBody.flag}${sendBody.number};${sendBody.message}\n`;
        console.log( sendBody.message );
        port.write( writeString , function(err) {
            if (err) {
                reject({ type : 'SerialCommError' , message : 'Cannot communicate to serial...' });
            }
            serialFlag.on( 'messageSent' , ( eventData ) => { // TODO: remove event listener upon completion
                console.log( 'you managed!' );
                serialFlag.removeAllListeners(["messageSent"]);
                resolve({ status : 'OK' , message : `Message send success, the message: ${sendBody.message} sent to the number ${sendBody.number}` });
            });
            // setTimeout( () => { // TODO: set timeout function, reject if not sent after interval
            //     reject( { type : 'SerialTimeOutError' , message : 'Serial took too long to respond...' } );
            // }, 30000 );
        });
    });
}

module.exports.sendMessage = sendMessage;