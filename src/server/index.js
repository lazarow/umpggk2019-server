const net = require('net');
const log = require('./log.js')(__filename);
const SocketClient = require('./SocketClient.js');
const Tournament = require('./Tournament.js');
const parameters = require('minimist')(process.argv.slice(2), {
	default: {
		port: 6789,
		system: 'roundrobin',
		nofrounds: null
	}
});

const server = net.createServer();
server.listen(parameters.port);
log.info('The server is listening on the address: ' + server.address().address
	+ ' and the port: ' + server.address().port);
const tournament = new Tournament(parameters.system, parameters.nofrounds);
server.on('connection', (socket) => {
	const client = new SocketClient(socket);
	log.info('The new connection (id no. ' + client.id + ') has been established by the initiator '
		+ client.socket.remoteAddress);
	client.socket.on('data', (data) => { // Handles clients messages
		const message = Buffer.isBuffer(data) ? data.toString().trim() : data.trim(),
			  splitted = message.split(' '),
			  code = splitted[0],
			  options = splitted.slice(1);
		log.info('The message from the ' + client.socket.remoteAddress + ' (id no. ' 
			+ client.id + '): ' + message);
		// A player's commands
		if (code == '100') { // Registers a new player
			if (/\s/g.test(options[0])) { // Checks if the name contains whitechars
				client.socket.write('999 The player\'s name cannot contain whitespaces');
			} else {
				client.registerAsPlayer(options[0]);
				log.debug('The connection (id no. ' + client.id + ') is registered as the player: '
					+ options[0]);
			}
		}
		// An admin's commands
	});
	// The errors handling
	client.socket.on('close', () => {
		client.disconnect();
		log.warning('The connection (id no. ' + client.id + ') is lost from the initiator '
			+ client.socket.remoteAddress);
	});
	client.socket.on('error', () => {
		client.disconnect();
		log.error('The connection (id no. ' + client.id + ') is abruptly lost from the initiator '
			+ client.socket.remoteAddress);
	});
});
