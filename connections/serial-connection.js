const SerialPort = require('serialport')

const port = new SerialPort('COM3', function (err) {
  if (err) {
    return console.log('Cannnot open device, running as server only...') // TODO: error handling on startup here
  }
})

module.exports = port;