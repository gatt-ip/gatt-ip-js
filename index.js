if(typeof process === 'object' && process + '' === '[object process]') {
	module.exports.GATTIP = require('./gattip').GATTIP;
	module.exports.GattIpServer = require('./gattip-server').GattIpServer;
}