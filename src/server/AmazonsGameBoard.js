const log = require('./log.js')(__filename);
/**
 * Errors codes:
 * 1 -> no moves left for the player
 * 2 -> the invalid move's coordinates
 * Exception format:
 * [code, player]
 */
const defaultSize = 10;
const defaultInitialState = '...w..w...' + '..........' + '..........' + 'w........w'
	+ '..........' + '..........' + 'b........b' + '..........' + '..........' + '...b..b...';

module.exports = class AmazonsGameBoard
{
	constructor(initialState) {
		this.initialState = initialState || defaultInitialState;
		this.size = Math.sqrt(this.initialState.length);
		this.reset();
	}
	reset() {
		this.state = this.initialState.split('');
		this.state.toString = function () {
			return this.join('');
		};
		this.whiteAmazons = [];
		this.blackAmazons = [];
		for (let i = 0; i < this.state.length; ++i) {
			if (this.state[i] === 'w') {
				this.whiteAmazons.push(i);
			} else if (this.state[i] === 'b') {
				this.blackAmazons.push(i);
			}
		}
        this.player = 'white';
        this.generateAvailableMoves();
	}
	positionToIndex(position) {
        let x = position.substring(0, 1).charCodeAt(0) - 97;
        let y = parseInt(position.substring(1)) - 1;
		return this.coordinatesToIndex(x, y);
	}
    coordinatesToIndex(x, y) {
		return y * this.size + x;
	}
    indexToCoordinates(index) {
        return [index % this.size, Math.floor(index / this.size)];
    }
	indexToPosition(index) {
		let x = index % this.size;
		let y = Math.floor(index / this.size);
        return String.fromCharCode(97 + x) + '' + (y + 1);
    }
    checkIsMoveAvailable(from, to, shoot) {
		for (let move of this.availableMoves) {
			if (move[0] == from && move[1] == to && move[2] == shoot) {
				return true;
			}
		}
        return false;
    }
	printAvailableMoves() {
		let i = 0;
		console.log('Start printing all moves for the board state: ' + this.state
			+ ' and the player: ' + this.player);
		for (let move of this.availableMoves) {
			console.log('[#' + ++i + '] from: ' + move[0] + ' (' + this.indexToPosition(move[0])
				+ '), to: ' + move[1] + ' (' + this.indexToPosition(move[1])
				+ ') and shoot: ' + move[2] + ' (' + this.indexToPosition(move[2]) + ')');
		}
		console.log('End');
	}
	printFullBoard() {
		let board = '  ';
		for (let x = 0; x < this.size; ++x) {
			board += '| ' + String.fromCharCode(97 + x) + ' ';
		}
		for (let y = this.size - 1; y >= 0; --y) {
			board += '\n' + (y < 9 ? ' ' : '') + (y + 1);
			for (let x = 0; x < this.size; ++x) {
				let i = y * this.size + x;
				board += '| ' + this.state[i] + ' ';
			}
		}
		console.log(board);
	}
    makeMove(from, to, shoot) {
        from = this.positionToIndex(from);
        to = this.positionToIndex(to);
        shoot = this.positionToIndex(shoot);
        if (this.checkIsMoveAvailable(from, to, shoot) === false) {
            throw [2, this.player];
        }
        this.state[from] = '.';
        this.state[to] = this.player.substring(0, 1);
        this.state[shoot] = 'x';
        this[this.player + 'Amazons'][this[this.player + 'Amazons'].indexOf(from)] = to;
        this.player = this.player === 'black' ? 'white' : 'black';
        this.generateAvailableMoves();
    }
    generateAvailableMoves() {
        this.availableMoves = [];
        const transitions = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
        for (let amazon of this[this.player + 'Amazons']) {
            let x, y;
            [x, y] = this.indexToCoordinates(amazon);
            for (let transition1 of transitions) {
				let tx = x;
				let ty = y;
				while (true) {
					tx += transition1[0], ty += transition1[1];
					let target = this.coordinatesToIndex(tx, ty);
					if (
						this.state[target] !== '.'
						|| tx < 0 || tx == this.size
						|| ty < 0 || ty == this.size
					) {
						break;
					}
					for (let transition2 of transitions) {
						let sx = tx;
						let sy = ty;
						while (true) {
							sx += transition2[0], sy += transition2[1];
							let shoot = this.coordinatesToIndex(sx, sy);
							if (
								(shoot !== amazon && this.state[shoot] !== '.')
								|| sx < 0 || sx == this.size
								|| sy < 0 || sy == this.size
							) {
								break;
							}
							this.availableMoves.push([amazon, target, shoot]);
						}
					}
				}
            }
        }
        if (this.availableMoves.length === 0) {
            throw [1, this.player];
        }
    }
}