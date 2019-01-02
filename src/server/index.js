const net = require('net');
const readline = require('readline');
const log = require('./log.js')(__filename);
const TournamentRegistry = require('./TournamentRegistry.js');
const Tournament = require('./Tournament.js');
const parameters = require('minimist')(process.argv.slice(2), {
	default: {
		port: 6789,
		register: './tournament-register.json',
		system: 'roundrobin',
		nofgames: 10,
		timelimit: 2000
	}
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
// creates the server
const server = net.createServer();
server.listen(parameters.port);
log.info('The server is listening on the address: ' + server.address().address
	+ ' and the port: ' + server.address().port);
const socketClients = [];
// creates the tournament
const registry = new TournamentRegistry(parameters.register, {
	system: parameters.system,
	nofGames: parameters.nofgames,
	timelimit: parameters.timeLimit,
	autostart: false
});
const tournament = new Tournament(socketClients, registry);
rl.question('Press [ENTER] to start the next round ', (answer) => {
	tournament.startUncompletedRound();
	rl.close();
});
// handles the server communication
server.on('connection', (socketClient) => {
	socketClient.playerIdx = null;
	log.info('The new connection has been established by the initiator ' + socketClient.remoteAddress);
	// handles the client's messages
	socketClient.on('data', (data) => {
		const message = Buffer.isBuffer(data) ? data.toString().trim() : data.trim(),
			  splitted = message.split(' '),
			  code = splitted[0],
			  options = splitted.slice(1);
		log.info('The message from ' + socketClient.remoteAddress + ': ' + message);
		// says `hi`
		if (code == '100') {
			if (/\s/g.test(options[0])) { // Checks if the name contains whitechars
				socketClient.write('999 The player\'s name cannot contain whitespaces');
			} else {
				socketClient.playerIdx = tournament.addPlayer(options[0]);
				log.debug('The connection from ' + socketClient.remoteAddress + ' is registered as the player: ' + options[0]);
			}
		}
		// makes a move
		else if (code == '210') {
			tournament.applyMove(socketClient.playerIdx, options);
			log.debug('The connection from ' + socketClient.remoteAddress + ' made the move: ' + options.join('-'));
		}
	});
	// handles errors
	socketClient.on('close', () => {
		log.warning('The connection is lost from the initiator ' + socketClient.remoteAddress);
		tournament.disconnect(socketClient.playerIdx);
	});
	socketClient.on('error', () => {
		log.error('The connection is abruptly lost from the initiator ' + socketClient.remoteAddress);
		tournament.disconnect(socketClient.playerIdx);
	});
});
