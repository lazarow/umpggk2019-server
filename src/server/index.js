const net = require('net');
const rl = require('./readline.js');
const log = require('./log.js')(__filename);
const TournamentRegistry = require('./TournamentRegistry.js');
const Tournament = require('./Tournament.js');
const parameters = require('minimist')(process.argv.slice(2), {
	default: {
		port: 6789,
		register: './tournament-register.json',
		system: 'roundrobin',
		nofgames: 10,
		timelimit: 2000,
		autostart: false,
		nosaving: false,
		restore: false
	}
});
// creates the server
const server = net.createServer();
server.listen(parameters.port);
log.info('The server is listening on the address: ' + server.address().address
	+ ' and the port: ' + server.address().port);
const socketClients = [];
// creates the tournament
const registry = new TournamentRegistry(parameters.register + (parameters.restore ? '' : (+ new Date())), {
	system: parameters.system,
	nofGames: parameters.nofgames,
	timeLimit: parameters.timelimit,
	autostart: parameters.autostart,
	nosaving: parameters.nosaving
});
const tournament = new Tournament(socketClients, registry);
rl.on('line', (input) => {
	log.info(`The ADMINISTRATOR's command received: ${input}`);
	if (input === 'start') {
		tournament.startUncompletedRound();
	}
});
// handles the server communication
server.on('connection', (socketClient) => {
	socketClient.live = true;
	socketClient.playerIdx = null;
    socketClients.push(socketClient);
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
			// checks if the name contains whitechars
			if (/\s/g.test(options[0])) {
				socketClient.write('999 The player\'s name cannot contain whitespaces');
			} else {
				socketClient.playerIdx = tournament.addPlayer(options[0]);
			}
		}
		// makes a move
		else if (code == '210') {
            tournament.applyMove(socketClient.playerIdx, options);
		}
	});
	// handles errors
	socketClient.on('close', () => {
		log.warning('The connection is lost from the initiator ' + socketClient.remoteAddress + ', player idx = '
            + socketClient.playerIdx);
        socketClient.live = false;
		tournament.disconnect(socketClient.playerIdx);
	});
	socketClient.on('error', (e) => {
		log.error('The connection is abruptly lost from the initiator ' + socketClient.remoteAddress + ', player idx = '
            + socketClient.playerIdx);
        socketClient.live = false;
		tournament.disconnect(socketClient.playerIdx);
	});
});
