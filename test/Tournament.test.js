const TournamentRegistry = require('./../src/server/TournamentRegistry.js');
const Tournament = require('./../src/server/Tournament.js');
const log = require('./../src/server/log.js')(__filename);

let playerIdx = 0;
function createSocketClientMock() {
	return {
		playerIdx: playerIdx++,
		remoteAddress: '0.0.0.0',
		lastMessage: null,
		write: function (message) {
			log.debug('[' + this.playerIdx + '] I have received the message: ' + message);
			this.lastMessage = message;
		}
	};
}

test('check a simple tournament for 2 players', () => {
    let register = new TournamentRegistry('./test' + (+ new Date()) + '.json', {
		nofGames: 4,
		timeLimit: 200
	});
    let clients = [
        createSocketClientMock(),
        createSocketClientMock()
    ];
    let tournament = new Tournament(clients, register);
    tournament.addPlayer('a');
    tournament.addPlayer('b');
    tournament.startUncompletedRound();
    expect(register._.rounds.length).toBe(1);
    expect(register._.matches.length).toBe(1);
    expect(register._.games.length).toBe(4);
	// the fisrt game
	expect(clients[0].lastMessage).toMatch(/200/);
	expect(clients[1].lastMessage).toMatch(/200/);
	expect(register._.games[0].startedAt).not.toBeNull();
	expect(register._.games[0].finishedAt).toBeNull();
	tournament.applyMove(0, ['d1', 'd4', 'b6']);
	tournament.applyMove(1, ['a7', 'a5', 'j5']);
	expect(register._.games[0].moves.length).toBe(2);
	expect(register._.games[0].finishedAt).toBeNull();
	tournament.applyMove(0, ['d4', 'c5', 'c10']);
	expect(register._.games[0].moves.length).toBe(3);
	expect(register._.games[0].finishedAt).toBeNull();
	tournament.applyMove(1, ['a5', 'd5', 'd1']);
	expect(register._.games[0].moves.length).toBe(3);
	expect(register._.games[0].finishedAt).not.toBeNull();
	expect(register._.games[0].winner).toBe('white');
	// the second game
	tournament.applyMove(1, ['d1', 'd4', 'b6']);
	expect(register._.games[1].moves.length).toBe(0);
	expect(register._.games[1].finishedAt).not.toBeNull();
	expect(register._.games[1].winner).toBe('white');
	// the third game
	let waitTill = new Date(new Date().getTime() + 201);
	while (waitTill > new Date()) {}
	tournament.startMovesTimeoutsChecking();
	expect(register._.games[2].moves.length).toBe(0);
	expect(register._.games[2].finishedAt).not.toBeNull();
	expect(register._.games[2].winner).toBe('black');
	// the fourth game
	tournament.disconnect(1);
	expect(register._.games[2].moves.length).toBe(0);
	expect(register._.games[2].finishedAt).not.toBeNull();
	expect(register._.games[2].winner).toBe('black');
});
