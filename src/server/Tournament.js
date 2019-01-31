const robin = require('roundrobin');
const log = require('./log.js')(__filename);
const AmazonsGameBoard = require('./AmazonsGameBoard.js');

String.prototype.pad = function(l, s = ' ', t = 0){
    return s || (s = " "), (l -= this.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + this + s.substr(0, l - t) : this;
};

module.exports = class Tournament
{
	constructor(socketClients, tournamentRegistry) {
        this.socketClients = socketClients;
        this.movesTimeoutsCheckingTimer = null;
        this.boards = [];
        this._ = tournamentRegistry;
	}
    addPlayer(playerName) {
        let player = this._._.players.find(player => player.name === playerName);
        if (typeof player === 'undefined') {
            if (this._._.isStarted === true) {
                return -1;
            }
            let playerIdx = this._._.players.length;
            this._._.players[playerIdx] = {
                idx: playerIdx,
                name: playerName,
                points: 0,
                sos: 0,
                sodos: 0,
                defeatedOpponents: [],
                opponents: [],
                byeRounds: [],
                wins: 0,
                loses: 0,
                draws: 0
            };
            return playerIdx;
        }
        return player.idx;
    }
    startUncompletedRound() {
        // checks if the last round is finished
        let round = this._._.rounds.find(round => round.finishedAt === null);
        if (typeof round !== 'undefined') {
			log.warning('The last round has not be finished');
            return;
        }
        // saves the current data before every round
        this._.save();
        // marks a tournament as started
        if (this._._.isStarted === false) {
            // start moves timeouts checking timer
            this.movesTimeoutsCheckingTimer = setInterval(() => this.startMovesTimeoutsChecking(), 200);
        }
        this._._.isStarted = true;
        // now, starts the current round
        const roundIdx = this._._.rounds.length;
        this._._.rounds[roundIdx] =  {
            idx: roundIdx,
			startedAt: + new Date(),
			finishedAt: null,
			matches: []
		};
        // creates the pairing for the current round
        let pairing = [];
		if (this._._.options.system === 'roundrobin') {
			const roundRobinRounds = robin(this._._.players.length, Object.keys(this._._.players));
			if (roundIdx < roundRobinRounds.length) {
				pairing = roundRobinRounds[roundIdx];
			}
		} else if (this._._.options.system === 'mcmahon') {
            // McMahon system tournament
            let competitors = Object.keys(this._._.players);
            competitors.sort((playerA, playerB) =>  {
                if (this._._.players[playerA].points > this._._.players[playerB].points) return -1;
                if (this._._.players[playerA].points < this._._.players[playerB].points) return 1;
                if (this._._.players[playerA].sodos > this._._.players[playerB].sodos) return -1;
                if (this._._.players[playerA].sodos < this._._.players[playerB].sodos) return 1;
                if (this._._.players[playerA].sos > this._._.players[playerB].sos) return -1;
                if (this._._.players[playerA].sos < this._._.players[playerB].sos) return 1;
                return 0;
            });
            for (let i = 0; i < competitors.length; ++i) {
                if (competitors[i] === -1) continue;
                for (let j = i + 1; j < competitors.length; ++j) {
                    if (competitors[j] === -1) continue;
                    if (this._._.players[competitors[i]].opponents.indexOf(competitors[j]) !== -1) continue;
                    pairing.push([competitors[i], competitors[j]]);
                    competitors[i] = -1;
                    competitors[j] = -1;
                    break;
                }
            }
            if (pairing.length > 0) {
                for (let i = 0; i < competitors.length; ++i) {
                    if (competitors[i] === -1) continue;
                    this._._.players[competitors[i]].points += 0.5; // bye
                    this._._.players[competitors[i]].byeRounds.push(roundIdx);
                }
            }
        }
        // creates matches and games
        for (let competitors of pairing) {
            let matchIdx = this._._.matches.length;
            this._._.matches[matchIdx] = {
                idx: matchIdx,
                roundIdx: roundIdx, // reduces searching
				players: [competitors[0], competitors[1]],
                points: [0, 0],
				startedAt: null,
				finishedAt: null,
				games: []
			};
            this._._.players[competitors[0]].opponents.push(competitors[1]);
            this._._.players[competitors[1]].opponents.push(competitors[0]);
			for (let i = 0; i < this._._.options.nofGames; ++i) {
                let gameIdx = this._._.games.length;
				this._._.games[gameIdx] = {
                    idx: gameIdx,
                    matchIdx: matchIdx, // reduces searching
                    roundIdx: roundIdx, // reduces searching
					white: i < this._._.options.nofGames / 2 ? competitors[0] : competitors[1],
					black: i < this._._.options.nofGames / 2 ? competitors[1] : competitors[0],
					winner: null,
					loser: null,
					wonBy: null,
					startedAt: null,
					finishedAt: null,
					lastMoveAt: null,
                    playerOnMove: null,
                    moveTimeout: null,
                    initialBoard: null,
                    currentBoard: null,
                    moves: [],
					times: []
				};
				this._._.matches[matchIdx].games.push(gameIdx);
			}
			this._._.rounds[roundIdx].matches.push(matchIdx);
		}
		log.info('The round #' + roundIdx + ' has been started with ' + this._._.rounds[roundIdx].matches.length
			+ ' matches');
		// starts matches if available
		if (this._._.rounds[roundIdx].matches.length > 0) {
			this.startUncompletedMatches();
		} else {
			this._._.rounds[roundIdx].finishedAt = + new Date();
			log.info('No matches were found hence the tournament is over');
            let standinds = this.getCurrentStandings();
            for (let i = 0; i < standinds.length; ++i) {
                // sends the final standinds
                let socketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == standinds[i]);
                if(typeof socketClient !== 'undefined') {
                    socketClient.writeln('299 ' + (i + 1));
                }
            }
            this.printCurrentStandings();
		}
    }
    getCurrentStandings() {
        let standinds = Object.keys(this._._.players);
        standinds.sort((playerA, playerB) =>  {
            if (this._._.players[playerA].points > this._._.players[playerB].points) return -1;
            if (this._._.players[playerA].points < this._._.players[playerB].points) return 1;
            if (this._._.players[playerA].sodos > this._._.players[playerB].sodos) return -1;
            if (this._._.players[playerA].sodos < this._._.players[playerB].sodos) return 1;
            if (this._._.players[playerA].sos > this._._.players[playerB].sos) return -1;
            if (this._._.players[playerA].sos < this._._.players[playerB].sos) return 1;
            return 0;
        });
        return standinds;
    }
    printCurrentStandings() {
        let standinds = this.getCurrentStandings();
        let maxPlayerNameLength = null;
        for (let i = 0; i < standinds.length; ++i) {
            if (maxPlayerNameLength === null || this._._.players[standinds[i]].name.length > maxPlayerNameLength) {
                maxPlayerNameLength = this._._.players[standinds[i]].name.length;
            }
        }
        console.log(' #| ' + (' '.repeat(maxPlayerNameLength)) + ' |  W |  D |  L | Points | SODOS | SOS');
        for (let i = 0; i < standinds.length; ++i) {
            let player = this._._.players[standinds[i]];
            console.log(
                (i + 1 + '').pad(2)
                + '| ' + player.name + ' '.repeat(maxPlayerNameLength - player.name.length)
                + ' | ' + (player.wins + '').pad(2)
                + ' | ' + (player.draws + '').pad(2)
                + ' | ' + (player.loses + '').pad(2)
                + ' | ' + (player.points + '').pad(6)
                + ' | ' + (player.sodos + '').pad(5)
                + ' | ' + (player.sos + '').pad(3)
            );
        }
    }
    startUncompletedMatches() {
        let nofStartedMatches = 0;
		let usedIPAddresses = []; // holds IP addresses that can't be used
        // firstly, handles all running games
        this._._.matches.filter(match => match.startedAt !== null && match.finishedAt === null).forEach(match => {
            // checks IP addresses from running matches
            match.players.forEach(playerIdx => {
                let socketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == playerIdx);
                if(typeof socketClient !== 'undefined') {
                    usedIPAddresses.push(socketClient.remoteAddress);
                }
            });
            nofStartedMatches++;
        });
        // secondly, handles upcoming games that can be started
        this._._.matches.filter(match => match.startedAt === null).forEach(match => {
            let addresses = [];
            // checks IP addresses from upcoming matches
            match.players.forEach(playerIdx => {
                let socketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == playerIdx);
                if(typeof socketClient !== 'undefined') {
                    addresses.push(socketClient.remoteAddress);
                }
            });
            if (addresses.every(address => usedIPAddresses.indexOf(address) === -1)) {
                match.startedAt = + new Date();
                addresses.forEach(address => usedIPAddresses.push(address));
                nofStartedMatches++;
				log.info('The match #' + match.idx + ' has been started between '
					+ this._._.players[match.players[0]].name + ' and ' + this._._.players[match.players[1]].name);
            }
        });
        // finally, if there is no running matches, finishes the current round
        if (nofStartedMatches === 0) {
            let round = this._._.rounds.find(round => round.finishedAt === null);
            if (typeof round !== 'undefined') {
                round.finishedAt = + new Date();
                this._._.matches.filter(match => match.roundIdx === round.idx).forEach(match => {
                    console.log('The match #' + match.idx + ' -> ' 
                        + this._._.players[match.players[0]].name + ' ' + match.points[0]
                        + ':' + match.points[1] + ' ' + this._._.players[match.players[1]].name);
                });
            }
            // recalculates tie breakers
            for (let player of this._._.players) {
                player.sos = player.opponents.reduce((carry, playerIdx) => carry + this._._.players[playerIdx].points, 0);
                player.sodos = player.defeatedOpponents.reduce((carry, playerIdx) => carry + this._._.players[playerIdx].points, 0);
            }
            this.printCurrentStandings(); // after points recalculation
            // if the autostart flag is on, then the next round will be started
			if (this._._.options.autostart == true) {
				this.startUncompletedRound();
			}
            // if not wait for the administrator's command
        } else {
            this.startUncompletedGames(); // starts matches' games
        }
    }
    startUncompletedGames() {
        // filters out upcoming and finished matches
        this._._.matches.filter(match => match.startedAt !== null && match.finishedAt === null).forEach(match => {
            let hasUnfinishedGame = false;
            for (let gameIdx of match.games) {
                if (this._._.games[gameIdx].startedAt === null) {
					this._._.games[gameIdx].startedAt = + new Date(); // starts the game
					this._._.games[gameIdx].lastMoveAt = this._._.games[gameIdx].startedAt;
                    log.info('The game #' + gameIdx + ' has been started between '
                        + this._._.players[this._._.games[gameIdx].white].name + ' as white and '
                        + this._._.players[this._._.games[gameIdx].black].name + ' as black');
                    // finds corresponding socket clients
                    const whiteSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == this._._.games[gameIdx].white);
                    const blackSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == this._._.games[gameIdx].black);
					// both players are disconnected
                    if (whiteSocketClient === undefined && blackSocketClient === undefined) {
						this._._.games[gameIdx].finishedAt = + new Date();
						this._._.games[gameIdx].wonBy = 'Brak połączenia obu graczy';
					} else if (whiteSocketClient === undefined) { // white player is disconnected
                        this._._.games[gameIdx].finishedAt = + new Date();
                        this._._.games[gameIdx].winner = 'black';
                        this._._.games[gameIdx].loser = 'white';
                        this._._.games[gameIdx].wonBy = 'Brak połączenia przeciwnika';
						blackSocketClient.writeln('232');
					} else if (blackSocketClient === undefined) { // black player is disconnected
						this._._.games[gameIdx].finishedAt = + new Date();
						this._._.games[gameIdx].winner = 'white';
						this._._.games[gameIdx].loser = 'black';
						this._._.games[gameIdx].wonBy = 'Brak połączenia przeciwnika';
						whiteSocketClient.writeln('232');
					} else {
                        this._._.games[gameIdx].playerOnMove = 'white';
                        this._._.games[gameIdx].moveTimeout = (+ new Date()) + this._._.options.timeLimit;
                        // creates the board
                        this.boards[gameIdx] = new AmazonsGameBoard(this._._.options.initialBoard);
                        this._._.games[gameIdx].initialBoard = this._._.options.initialBoard;
                        this._._.games[gameIdx].currentBoard = this.boards[gameIdx].state.toString();
						setTimeout(() => {
                            blackSocketClient.writeln('200 black ' + this.boards[gameIdx].size + ' ' + this._._.options.initialBoard);
                            whiteSocketClient.writeln('200 white ' + this.boards[gameIdx].size + ' ' + this._._.options.initialBoard);
                        }, 100); // i've added a little timeout to be sure that all players are ready
						hasUnfinishedGame = true;
						break; // starts only one game
					}
                    if (this._._.games[gameIdx].wonBy !== null) {
                        log.info('The game #' + gameIdx + ' has been finished, '
                            + 'the winner is ' + this._._.games[gameIdx].winner + ' and the game is won by: '
                            + this._._.games[gameIdx].wonBy);
                    }
				}
            }
            // if there is no started games then finishes the match
            if (hasUnfinishedGame === false) {
                match.finishedAt = + new Date();
                log.info('The match #' + match.idx + ' has been finished');
                // sums up points
                for (let player in match.players) {
                    match.points[player] = match.games.reduce((carry, gameIdx) => {
                        let game = this._._.games[gameIdx];
                        return carry + (game.winner !== null && game[game.winner] == match.players[player] ? 1 : 0);
                    }, 0);
                }
                if (match.points[0] === match.points[1] && match.points[0] > 0) {
                    this._._.players[match.players[0]].points += 0.5;
                    this._._.players[match.players[1]].points += 0.5;
                    this._._.players[match.players[0]].draws += 1;
                    this._._.players[match.players[1]].draws += 1;
                } else if (match.points[0] > match.points[1]) {
                    this._._.players[match.players[0]].points += 1;
                    this._._.players[match.players[0]].defeatedOpponents.push(match.players[1]);
                    this._._.players[match.players[0]].wins += 1;
                    this._._.players[match.players[1]].loses += 1;
                } else if (match.points[1] > match.points[0]) {
                    this._._.players[match.players[1]].points += 1;
                    this._._.players[match.players[1]].defeatedOpponents.push(match.players[0]);
                    this._._.players[match.players[0]].loses += 1;
                    this._._.players[match.players[1]].wins += 1;
                }
				this.startUncompletedMatches();
            }
        });
    }
    startMovesTimeoutsChecking() {
        this._._.games.filter(game => game.startedAt !== null && game.finishedAt === null).forEach(game => {
            const currentTimestamp = + new Date();
            // checks if the move timeout is expired
            if (game.moveTimeout < currentTimestamp) {
                const winner = game.playerOnMove === 'white' ? 'black' : 'white';
                const loser = game.playerOnMove;
                // since JS is single-threaded hence the socket clients should be available
                const winnerSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[winner]);
                const loserSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[loser]);
                game.finishedAt = + new Date();
                game.winner = winner;
                game.loser = loser;
                game.wonBy = 'Przekroczenie czasu na ruch przeciwnika';
                if (typeof winnerSocketClient !== 'undefined') {
                    winnerSocketClient.writeln('231');
                }
                if (typeof loserSocketClient !== 'undefined') {
                    loserSocketClient.writeln('241');
                }
                log.info('The game #' + game.idx + ' has been finished, '
                    + 'the winner is ' + game.winner + ' and the game is won by: '
                    + game.wonBy);
                // because the game is finished, checks other unfinished games
                this.startUncompletedGames();
            }
        });
    }
    applyMove(playerIdx, move) {
        const game = this._._.games.find(
            game => (game.white == playerIdx || game.black == playerIdx)
            && game.startedAt !== null && game.finishedAt === null
        );
        // check if the game exists
        if (typeof game !== 'undefined') {
            try {
                // check is the player's turn
                if (game[game.playerOnMove] != playerIdx) {
                    throw [3, playerIdx];
                }
                // try to make a move
                this.boards[game.idx].makeMove(move[0], move[1], move[2]);
                // the move is correct hence update the game data
                game.playerOnMove = game.playerOnMove === 'white' ? 'black' : 'white';
                game.currentBoard = this.boards[game.idx].state.toString();
                game.moves.push(move);
                game.times.push((+ new Date()) - game.lastMoveAt);
				game.lastMoveAt = (+ new Date());
                // the player should be available
                const socketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[game.playerOnMove]);
                socketClient.writeln('220 ' + move[0] + ' ' + move[1] + ' ' + move[2]);
				// resets the timeout
				game.moveTimeout = (+ new Date()) + this._._.options.timeLimit;
            } catch (e) {
				let winner, loser;
                if (e[0] == 1) { // no moves for the next player
                    winner = game.playerOnMove;
                    loser = game.playerOnMove === 'white' ? 'black' : 'white';
                    game.wonBy = 'Wygrana zgodnie z zasadami';
                } else if (e[0] == 2) { // an invalid move has been played
                    winner = game.playerOnMove === 'white' ? 'black' : 'white';
                    loser = game.playerOnMove;
                    game.wonBy = 'Wygrana zgodnie z zasadami (niepoprawny ruch)';
                } else if (e[0] == 3) { // the player has played on the opponent's turn
                    winner = game.playerOnMove;
                    loser = game.playerOnMove === 'white' ? 'black' : 'white';
                    game.wonBy = 'Wygrana zgodnie z zasadami (zagranie nie w swojej turze)';
                }				
                // finishes the game and starts upcoming games
                const winnerSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[winner]);
                const loserSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[loser]);
                game.finishedAt = + new Date();
                game.winner = winner;
                game.loser = loser;
                winnerSocketClient.writeln('230');
                loserSocketClient.writeln('240');
                log.info('The game #' + game.idx + ' has been finished, '
                    + 'the winner is ' + game.winner + ' and the game is won by: '
                    + game.wonBy);
                this.startUncompletedGames();
            }
        }
    }
    /**
     * Handles a player disconnecting
     */
    disconnect(playerIdx) {
        const game = this._._.games.find(
            game => (game.white == playerIdx || game.black == playerIdx)
            && game.startedAt !== null && game.finishedAt === null
        );
        if (typeof game !== 'undefined') {
            const winner = game.white == playerIdx ? 'black' : 'white';
            const loser = game.white == playerIdx ? 'white' : 'black';
            // the socket client should be available
            const winnerSocketClient = this.socketClients.find(socketClient => socketClient.live && socketClient.playerIdx == game[winner]);
            game.finishedAt = + new Date();
            game.winner = winner;
            game.loser = loser;
            game.wonBy = 'Wygrana przez rozłączenie się przeciwnika';
            winnerSocketClient.writeln('232');
            log.info('The game #' + game.idx + ' has been finished, '
                + 'the winner is ' + game.winner + ' and the game is won by: '
                + game.wonBy);
            this.startUncompletedGames();
        }
    }
}