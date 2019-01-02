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
                    system: 'roundrobin',
                    nofGames: 10,
                    initialBoard: '...w..w.......................w........w....................b........b.......................b..b...',
                    timeLimit: 2000,
					autostart: false
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
        fs.writeFileSync(this.filepath, JSON.stringify(this._), 'utf8');
    }
}