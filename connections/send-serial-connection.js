const SendSerialPort = require('serialport')
const dotenv = require('dotenv')

dotenv.config()
console.log( `${process.env.SEND_SERIAL_PORT}` );
const sendPort = new SendSerialPort( process.env.SEND_SERIAL_PORT , function (err) {
  if (err) {
    return console.log('Cannnot open device, running as server only...') // TODO: error handling on startup here
  }
})

module.exports = sendPort;