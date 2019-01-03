const fs = require('fs');

module.exports = class TournamentRegistry
{
    constructor(filepath, options = {}) {
        this.filepath = filepath;
        if (fs.existsSync(filepath)) {
            this._ = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } else {
            this._ = {
                isStarted: false,
                options: Object.assign({
                    system: 'roundrobin', // the system algorithm creates pairing for each round
                    nofGames: 10, // the number of games in each match
                    initialBoard: '...w..w.......................w........w....................b........b.......................b..b...',
                    timeLimit: 2000, // the time limit per move in ms
					autostart: false, // starts round automatically (except the first round)
                    nosaving: false
                }, options),
                players: [],
                rounds: [],
                matches: [],
                games: []
            };
        }
        this.save();
    }
    save() {
        if (this._.options.nosaving == false) {
            fs.writeFileSync(this.filepath, JSON.stringify(this._), 'utf8');
        }
    }
}