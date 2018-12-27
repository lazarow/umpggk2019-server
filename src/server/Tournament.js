const robin = require('roundrobin');

module.exports = class Tournament
{
	constructor(socketClients, tournamentRegistry) {
        this.socketClients = socketClients;
        this._ = tournamentRegistry;
	}
    addPlayer(playerName) {
        this._._.players.push({
            name: playerName
        });
    }
    startUncompletedRound() {
        this._._.isStarted = true; // marks a tournament as started
        // now, starts the current round
        const roundIdx = this._._.rounds.length;
        this._._.rounds[roundIdx] =  {
			startedAt: + new Date(),
			finishedAt: null,
			matches: []
		};
        let pairing = [];
		if (this._._.options.system === 'roundrobin') {
			const roundRobinRounds = robin(this.players.length, Object.keys(this.players));
			if (this.state.currentRound < roundRobinRounds.length) {
				pairing = roundRobinRounds[this.state.currentRound];
			}
		}
        for (let competitors of pairing) {
            let matchIdx = this._._.matches.length;
            this._._.matches[matchIdx] = {
				players: competitors,
				startedAt: null,
				finishedAt: null,
				games: []
			};
			for (let i = 0; i < this._._.options.nofGames; ++i) {
                let gameIdx = this._._.games.length;
				this._._.games[gameIdx] = {
					white: i < this._._.options.nofGames / 2 ? competitors[0] : competitors[1],
					black: i < this._._.options.nofGames / 2 ? competitors[1] : competitors[2],
					winner: null,
					loser: null,
					wonBy: null,
					startedAt: null,
					finishedAt: null
				};
				this._._.matches[matchIdx].games.push(gameIdx);
			}
			this._._.rounds[roundIdx].matches.push(matchIdx);
		}
        
    }
}