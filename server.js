//main setup
const express = require('express');
const fs = require('fs');
const https = require('https');
var app = express();
var credential = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cer')
}
var httpsServer = https.createServer(credential, app);
const io = require('socket.io')(httpsServer);
const browserify = require('browserify-middleware');
const internalip = require('internal-ip');
var ipAdd = internalip.v4.sync();
//Microbit Serial Port
const serialport = require('serialport');
var microbitComPorts = [];
const baudRate = {
  baudRate: 115200
}
var port;
serialport.list().then(
  (ports) => {
    ports.forEach(function(com) {
      if (com.manufacturer === 'Microsoft') {
        console.log(com.comName);
        microbitComPorts.push(com.comName.toString());
      }
    })
    console.log(microbitComPorts);
    const SERIAL_PORT = microbitComPorts[0];
    port = new serialport(SERIAL_PORT, baudRate);
  }
)
const WEB_ADDRESS = `https://${ipAdd}:3000`

//const microbit = new serialport('')
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/css', express.static(__dirname + '/public'));
app.get('/dist/app.js', browserify('./main.js'));
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

//socket event
io.on('connection', function(socket) {
  console.log('a user connected');
  //socket client connected
  socket.emit('connected')
  //according to confidence output.output number is changed. The number means the confidence of n-th class is greater than 90%
  socket.on('output', (output) => {
    console.log(output.id);
    console.log(output.output);
    console.log(typeof(output.output));
    //control the 'output' event timing using setTimeout()
    //TODO. Serial Communication with microbit
    setTimeout(() => {
      socket.emit('recieved', output.output)
    }, 5000);
    port.write(output.output.toString() + "\n", function(err) {
      if (err) {
        return console.log("Error : ", err.message);
      }
      console.log('Message written');
    })
  })
})

httpsServer.listen(3000, function() {
  console.log(WEB_ADDRESS);
});
