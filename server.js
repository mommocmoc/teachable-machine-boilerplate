
const express = require('express');
const fs = require('fs');
const https = require('https');
var app = express();
var credential = {key:fs.readFileSync('server.key'),cert:fs.readFileSync('server.cer')}
var httpsServer = https.createServer(credential, app);
const io = require('socket.io')(httpsServer);
const browserify = require('browserify-middleware');
//Address : 수업시 수정
const WEB_ADDRESS = 'https://192.168.0.4:3000'

//Serialport
const serialport = require('serialport');
//const microbit = new serialport('')
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/css', express.static(__dirname + '/public'));
app.get('/dist/app.js',browserify('./main.js'));
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

//socket event
io.on('connection',function(socket) {
  console.log('a user connected');
  //socket client connected
  socket.emit('connected')
  //according to confidence output.output number is changed. The number means the confidence of n-th class is greater than 90%
  socket.on('output',(output)=>{
    console.log(output.id);
    console.log(output.output);
    //control the 'output' event timing using setTimeout()
    //TODO. Serial Communication with microbit
    setTimeout(()=> {socket.emit('recieved', output.output)} , 5000);
  })
})

httpsServer.listen(3000,function () {
  console.log(WEB_ADDRESS);
});
