const SerialPort = require('serialport')
const dotenv = require('dotenv')

dotenv.config()

const port = new SerialPort( process.env.SERIAL_PORT , function (err) {
  if (err) {
    return console.log('Cannnot open device, running as server only...') // TODO: error handling on startup here
  }
})

module.exports = port;