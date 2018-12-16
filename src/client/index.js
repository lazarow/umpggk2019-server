const net = require('net');
const log = require('./../server/log.js')(__filename);
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
	client.on('data', (data) => {
		const message = data.toString('utf8');
		log.debug(name + 'has received the message: ' + message);
	});
	client.on('error', () => {
		log.error(name + ' has encountered a connection error with the server');
	});
	client.on('close', () => {
		log.warning(name + ' has been disconnected');
	});
}