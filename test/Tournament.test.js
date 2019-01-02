const TournamentRegistry = require('./../src/server/TournamentRegistry.js');
const Tournament = require('./../src/server/Tournament.js');
const log = require('./../src/server/log.js')(__filename);

let playerIdx = 0;
function SocketClientMock() {
    this.playerIdx = playerIdx++;
    this.lastMessage = null;
    this.write = function (message) {
        log.debug('[' + this.playerIdx + '] I have received the message: ' + message);
        this.lastMessage = message;
    };
}

test('check a simple tournament for 2 players', () => {
    let register = new TournamentRegistry('./test' + (+ new Date()) + '.json', {});
    let clients = [
        new SocketClientMock(),
        new SocketClientMock()
    ];
    let tournament = new Tournament(clients, register);
    tournament.addPlayer('a');
    tournament.addPlayer('b');
    tournament.startUncompletedRound();
    expect(register._.rounds.length).toBe(1);
    expect(register._.matches.length).toBe(1);
    expect(register._.games.length).toBe(10);
    console.log(register._);
});
