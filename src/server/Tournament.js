const robin = require('roundrobin');

module.exports = class Tournament
{
	constructor(system, nofRounds) {
		this.system = system;
		this.nofRounds = nofRounds;
		this.currentRound = -1;
		this.currentRoundMatches = [];
		this.isStarted = false;
	}
	register(players) {
		this.players = players;
		if (this.system === 'roundrobin') {
			this.preCachedRounds = robin(this.players.length, Object.keys(this.players));
		}
	}
	startNextRound() {
		this.currentRound++;
		this.currentRoundMatches = [];
		if (this.system === 'roundrobin') {
			for (let players of this.preCachedRounds[this.currentRound]) {
				let match = {
					players: [this.players[players[0]], this.players[players[1]]],
					playersNames: [players[0], players[1]],
					points: [0, 0],
					startedAt: null,
					finishedAt: null,
					duration: null,
					games: [],
					isCompleted: false
				};
				this.currentRoundMatches.push(match);
			}
		}
	}
}