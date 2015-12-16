if(typeof process === 'object' && process + '' === '[object process]') {
	var client = require('./gattip');
	var server = require('./gattip-server');

	module.exports = {
		client: client,
		server: server
	};
}