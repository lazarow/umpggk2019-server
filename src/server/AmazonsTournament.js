const robin = require('roundrobin');
const JsonDB = require('node-json-db');
const AmazonsGameBoard = require('./AmazonsGameBoard.js');

const db = new JsonDB('./../../tournament-data.json', false, false);

module.exports = class AmazonsTournament
{
	constructor(settings = {}) {
		this.settings = Object.assign({
			system: 'roundrobin',
			nofGames: 10,
			initialBoard: '...w..w.......................w........w....................' 
				+ 'b........b.......................b..b...',
			timeLimit: 2000
		}, settings);
		this.state = {
			isStarted: false,
			currentRound: -1
		}; 
		this.rounds = [];
		this.players = [];
	}
	save() {
		db.push('/settings', this.settings);
		db.push('/state', this.state);
		db.push('/rounds', this.rounds);
		db.push('/players', this.players);
	}
	reload() {
		this.settings = db.getData('/settings');
		this.state = db.getData('/state');
		this.rounds = db.getData('/rounds');
		this.players = db.getData('/players');
		// Marks all players as disconnected
		this.players.forEach((player) => player.socketClient = null);
	}
	registerPlayer(playerName, socketClient) {
		// Checks if the player exists in the data for saving statistics
		if (playerName in this.players) {
			this.players[playerName].socketClient = socketClient;
		}
		// If not then add a new player if the tournament is not started yet
		else if (this.state.isStarted === false) {
			this.players[playerName] = {
				name: playerName,
				socketClient: socketClient,
				points: 0
			};
		}
		this.save();
	}
	unregisteredPlayer(playerName) { // Uses for marking disconnected players
		this.players[playerName].socketClient = null;
	}
	startCurrentRound() {
		let round = {
			startedAt: + new Date(), // the current timestamp in miliseconds
			finishedAt: null,
			duration: null,
			matches: []
		};
		// Generating pairing
		let pairing = [];
		if (this.settings.system === 'roundrobin') {
			const roundRobinRounds = robin(this.players.length, Object.keys(this.players));
			if (this.state.currentRound < roundRobinRounds.length) {
				pairing = roundRobinRounds[this.state.currentRound];
			}
		}
		// Generate matches
		for (let competitors of pairing) {
			let match = {
				players: competitors,
				points: [0, 0],
				startedAt: null,
				finishedAt: null,
				games: []
			};
			for (let i = 0; i < this.settings.nofGames; ++i) {
				let game = {
					white: i < this.settings.nofGames / 2 ? competitors[0] : competitors[1],
					black: i < this.settings.nofGames / 2 ? competitors[1] : competitors[2],
					winner: null,
					loser: null,
					wonBy: null,
					startedAt: null,
					finishedAt: null,
					board: null
				};
				match.games.push(game);
			}
			round.matches.push(match);
		}
		this.rounds[this.state.currentRound] = round;
		this.startUncompletedMatches();
	}
	startUncompletedMatches() {
		let nofStartedMatches = 0;
		let IPAddressesInUse = [];
		for (let match of this.rounds[this.state.currentRound].matches) {
			let addresses = [
				this.players[match.players[0]].socketClient.remoteAddress,
				this.players[match.players[1]].socketClient.remoteAddress
			];
			if (match.startedAt === null) {
				if (IPAddressesInUse.indexOf(addresses[0]) >= 0 || IPAddressesInUse.indexOf(addresses[1]) >= 0) {
					continue;
				}
				match.startedAt = + new Date();
				IPAddressesInUse.push(addresses[0]);
				IPAddressesInUse.push(addresses[1]);
				nofStartedMatches++;
			} else if (match.finishedAt === null) {
				IPAddressesInUse.push(addresses[0]);
				IPAddressesInUse.push(addresses[1]);
				nofStartedMatches++;
			}
		}
		if (nofStartedMatches === 0) {
			this.rounds[this.state.currentRound].finishedAt = + new Date();
			this.state.currentRound++;
			this.save(); // Saves the ended round
		} else {
			this.startUncompletedGame();
		}
	}
	startUncompletedGame() {
		for (let match of this.rounds[this.state.currentRound].matches) {
			// Excludes all unstarted and finished matches
			if (match.startedAt === null || match.finishedAt !== null) {
				continue;
			}
			let nofStartedGames = 0;
			for (let game of match.games) {
				if (game.startedAt === null) {
					game.startedAt = + new Date();
					if (
						this.players[game.white].socketClient === null
						&& this.players[game.black].socketClient === null
					) {
						game.finishedAt = + new Date();
						game.wonBy = 'Brak połączenia';
					} else if (this.players[game.white].socketClient === null) {
						game.finishedAt = + new Date();
						game.winner = 'black';
						game.loser = 'white';
						game.wonBy = 'Brak połączenia';
						this.players[game.black].socketClient.write('232');
					} else if (this.players[game.black].socketClient === null) {
						game.finishedAt = + new Date();
						game.winner = 'white';
						game.loser = 'black';
						game.wonBy = 'Brak połączenia';
						this.players[game.white].socketClient.write('232');
					} else {
						game.board = new AmazonsGameBoard(this.settings.initialBoard);
						
						nofStartedGames++;
						break;
					}
				}
			}
			if (nofStartedGames === 0) {
				match.finishedAt = + new Date();
				this.startUncompletedMatches();
			}
		}
	}
}