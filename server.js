var dotenv = require('dotenv');
var express = require('express');
var bodyParser = require('body-parser');
const router = require('./router');
const deviceConn = require('./connectDevice');
const ox = require('./queue-manager');

const Readline = require('@serialport/parser-readline')

var app = express();

const parser = deviceConn.pipe(new Readline({ delimiter: '\r\n' }))

dotenv.config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/',router);

app.listen( process.env.PORT , () => {
  console.log(`${process.env.APP_NAME} listening at http://localhost:${process.env.PORT}`)
})

// var sendDone = false; // TODO: set a flag to prevent sending two messages at once 

// switch case for serial input
parser.on('data', ( data ) => {
  // console.log( data );
  const key = data.split( ';' );
  var initAttempts = 0;
  switch( key[0] ) {
    case 'INIT':
      if( key[1] == 'SUCCESS' ) { // handle init success
        console.log( "the device started sucessfully!" );
        // queue manager code
        ox.process({
          work_fn : async function (job_body) {
            var promise = new Promise(function(resolve, reject) {
              console.log( 'this is happening inside the queue!' );
              console.log(job_body);
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
      else if( key[1] !== 'START' ) { // handle init failure
        console.log( "device failed. Throw error" );
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
        console.log( "message was successfully sent..." );
      }
      else { // handle error
        console.log( "message was not sent. Throw error" );
      }
      break;
    default:
      console.log('cannot understand input...');
  }
})