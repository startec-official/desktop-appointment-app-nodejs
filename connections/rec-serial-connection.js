const RecSerialPort = require('serialport')
const dotenv = require('dotenv')
const applog = require('../utils/debug-log');

dotenv.config()
console.log( `${process.env.REC_SERIAL_PORT}` );
const recPort = new RecSerialPort( process.env.REC_SERIAL_PORT , function (err) {
  if (err) {
    return applog.log('Cannnot open device, running as server only...') // TODO: error handling on startup here
  }
})

module.exports = recPort;