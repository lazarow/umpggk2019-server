const net = require('net');
const log = require('./../server/log.js')(__filename);
const AmazonsGameBoard = require('./../server/AmazonsGameBoard.js');
const uniqueNamesGenerator = require('unique-names-generator');
const parameters = require('minimist')(process.argv.slice(2), {
	default: {
		host: '127.0.0.1',
		port: 6789,
		nofclients: 1
	}
});

for (let i = 0; i < parameters.nofclients; ++i) {
	const client = new net.Socket();
	const name = uniqueNamesGenerator.generate();
	log.info(name + ' has been created');
	client.connect(parameters.port, parameters.host, () => {
		log.info(name + ' has been connected to the server successfully');
		client.write('100 ' + name); // Say Hi to the server
	});
	client.board = null;
	client.on('data', (data) => {
		const message = Buffer.isBuffer(data) ? data.toString().trim() : data.trim(),
			  splitted = message.split(' '),
			  code = splitted[0],
			  options = splitted.slice(1);
		log.debug(name + 'has received the message: ' + message);
		if (code == '200') {
			client.board = new AmazonsGameBoard(options[2]);
			if (options[0] == 'white') {
				
			}
		} else if (code == '220') {
			
		}
	});
	client.on('error', () => {
		log.error(name + ' has encountered a connection error with the server');
	});
	client.on('close', () => {
		log.warning(name + ' has been disconnected');
	});
}