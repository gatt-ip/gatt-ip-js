if(typeof process === 'object' && process + '' === '[object process]') {
	var client = require('./gatt-ip');
	var server = require('./gatt-ip-server');

	module.exports = {
		client: client,
		server: server
	};
}