/**
 * Errors codes:
 * 1 -> no moves left for the player
 * 2 -> the invalid move's coordinates
 * Exception format:
 * [code, player]
 */

function checkNested(obj) {
    const args = Array.prototype.slice.call(arguments, 1);
    for (let i = 0; i < args.length; i++) {
        if (! obj || ! obj.hasOwnProperty(args[i])) {
            return false;
        }
        obj = obj[args[i]];
    }
    return true;
}

class AmazonsGameBoard
{
	constructor() {
		this.size = 10;
		this.reset();
	}
	reset() {
		this.state = '.'.repeat(this.size * this.size);
		this.state[3] = this.state[6] = this.state[30] = this.state[39] = 'w';
        this.state[60] = this.state[69] = this.state[93] = this.state[96] = 'b';
		this.whiteAmazons = [3, 6, 30, 39];
		this.blackAmazons = [60, 69, 93, 96];
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
    indexToPosition(index) {
        return [index % this.size, Math.floor(index / this.size)];
    }
    makeMove(from, to, shoot) {
        from = this.positionToIndex(from);
        to = this.positionToIndex(to);
        shoot = this.positionToIndex(shoot);
        if (checkNested(this.availableMoves, from, to, shoot) === false) {
            throw [2, this.player];
        }
        this.state[from] = '.';
        this.state[to] = this.player.substring(0, 1);
        this.state[shoot] = 'x';
        this[this.player + 'Amazons'][this[this.player + 'Amazons'].findIndex(from)] = to;
        this.player = this.player === 'black' ? 'white' : 'black';
        this.generateAvailableMoves();
    }
    generateAvailableMoves() {
        this.availableMoves = [];
        const transitions = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
        for (let amazon of this[this.player + 'Amazons']) {
            let x, y;
            [x, y] = this.indexToPosition(amazon);
            for (let transition1 of transitions) {
                let tx = x + transition1[0], ty = y + transition1[1];
                let target = this.coordinatesToIndex(tx, ty);
                if (this.state[target] !== '.') {
                    break;
                }
                for (let transition2 of transitions) {
                    let shoot = this.coordinatesToIndex(tx + transition2[0], ty + transition2[1]);
                    if (this.state[shoot] !== '.') {
                        break;
                    }
                    this.availableMoves[amazon][target][shoot] = 1;
                }
            }
        }
        if (this.availableMoves.length === 0) {
            throw [1, this.player];
        }
    }
}