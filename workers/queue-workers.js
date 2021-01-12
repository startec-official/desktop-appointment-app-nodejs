var sendQueue = require('../queue/send-queue-manager'); // module containing send queue instance
var recQueue = require('../queue/rec-queue-manager'); // module containing recieve queue instance
var recWorkFn = require('../queue/rec-work-function'); // work function for the recieve queue instance
var sendWorkFn = require('../queue/send-work-function'); // work function for the send queue instance

var getSendPredefinedMessagePromise = ( sendType , sendFlag , sendNumber , sendMessage , occCount ) => {
    return new Promise((resolve , reject) => {
        try {
            sendQueue.addJob({
                body : { // adds a send job to the main server queue, details provided in queue-process.js
                    type : sendType ,
                    flag : sendFlag,
                    number : sendNumber,
                    message : sendMessage,
                    times : occCount
                }
            });
            resolve( { status : 'OK' , message : `send job with flag ${sendFlag} succesfully added to queue...` } );
        }
        catch( e ) {
            reject( { error : 'AddToQueueError' , message : 'there was an error adding job to queue...' } ); // TODO: error handling
        }
    });
}

var sendToRecQueuePromise = ( sendType , sendNumber , sendDate , sendMessage ) => {
    return new Promise((resolve , reject) => {
        try {
            recQueue.addJob({
                body : { // adds a send job to the main server queue, details provided in queue-process.js
                    type : sendType ,
                    number : sendNumber,
                    date : sendDate,
                    message : sendMessage
                }
            });
            resolve( { status : 'OK' , message : `recieve job of type ${sendType} succesfully added to queue...` } );
        }
        catch( e ) {
            reject( { error : 'AddToQueueError' , message : 'there was an error adding job to queue...' } ); // TODO: error handling
        }
    });
}

var startRecQueuePromise = ( recQueueConcurrency , recQueueTimeout ) => {
    return new Promise((resolve,reject) => {
        try {
            recQueue.process({
                work_fn : recWorkFn.work_fn, // define the function to run for the process
                concurrency : recQueueConcurrency, // number of processes to run simultaneously, 1 means executing queue processes them one by one
                timeout : recQueueTimeout // number of seconds before a queue process is aborted and considered failed
                // TODO: handle server timeout
            });
            resolve( { status : 'OK' , message : 'Reciever Queue successfully started...' } );
        }
        catch(e) {
            reject( { error : "QueueInitError" , message : 'Unable to start Reciever Queue....' } );
        }
    });
}

var startSendQueuePromise = ( sendQueueConcurrency , sendQueueTimeout ) => {
    return new Promise((resolve,reject) => {
        try {
            sendQueue.process({
                work_fn : sendWorkFn.work_fn, // define the function to run for the process
                concurrency : sendQueueConcurrency, // number of processes to run simultaneously, 1 means executing queue processes them one by one
                timeout : sendQueueTimeout // number of seconds before a queue process is aborted and considered failed
                // TODO: handle server timeout
            });
            resolve( { status : 'OK' , message : 'Sender Queue successfully started...' } );
        }
        catch(e) {
            reject( { error : "QueueInitError" , message : 'Unable to start Sender Queue....' } );
        }
    });
}

module.exports.sendPredefinedMessage = getSendPredefinedMessagePromise;
module.exports.startRecQueue = startRecQueuePromise;
module.exports.startSendQueue = startSendQueuePromise;
module.exports.sendToRecQueue = sendToRecQueuePromise;