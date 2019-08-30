const internalip = require('internal-ip');
var ipAdd = internalip.v4.sync();

const WEB_ADDRESS = `https://${ipAdd}:3000`

console.log(WEB_ADDRESS);
