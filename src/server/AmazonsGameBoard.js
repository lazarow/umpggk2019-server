class AmazonsGameBoard
{
	constructor() {
		this.size = 10;
		this.reset();
	}
	reset() {
		this.state = '.'.repeat(this.size * this.size);
		this.state[60] = this.state[69] = this.state[93] = this.state[96] = 'W';
		this.state[3] = this.state[6] = this.state[30] = this.state[39] = 'B';
		this.blackAmazons = [3, 6, 30, 39];
		this.whiteAmazons = [60, 69, 93, 96];
	}
	positionToIndex(position) {
		
	}
}