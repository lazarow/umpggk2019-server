const shortid = require('shortid');

class SocketClient
{
	constructor(socket) {
		this.id = shortid.generate();
		this.socket = socket;
		this.isConnected = true;
		this.isPlayer = false;
		SocketClient.clients[this.id] = this;
	}
	disconnect() {
		this.isConnected = false;
		delete SocketClient.clients[this.id];
	}
	registerAsPlayer(name) {
		this.isPlayer = true;
		this.playerName = name;
		this.currentGame = null;
		SocketClient.players[name] = this;
	}
}

SocketClient.clients = [];
SocketClient.players = [];

module.exports = SocketClient;