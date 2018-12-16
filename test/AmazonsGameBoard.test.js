const AmazonsGameBoard = require('./../src/server/AmazonsGameBoard.js');

test('after initialization the board should be on the initial layout', () => {
	let board = new AmazonsGameBoard();
	expect(board.state.toString()).toBe('...w..w.......................w........w....................b........b.......................b..b...');
	expect(board.size).toBe(10);
	expect(board.whiteAmazons).toEqual([3, 6, 30, 39]);
	expect(board.blackAmazons).toEqual([60, 69, 93, 96]);
});

test('the board should be on the custom initial layout', () => {
	let board = new AmazonsGameBoard('....w....');
	expect(board.state.toString()).toBe('....w....');
	expect(board.size).toBe(3);
	expect(board.whiteAmazons).toEqual([4]);
	expect(board.blackAmazons).toEqual([]);
});

test('the board should be altered after making a move', () => {
	let board = new AmazonsGameBoard('b...w....');
	board.makeMove('b2', 'c3', 'b2');
	expect(board.state.toString()).toBe('b...x...w');
	expect(board.whiteAmazons).toEqual([8]);
	expect(board.blackAmazons).toEqual([0]);
});

test('all available moves should be generated', () => {
	let board = new AmazonsGameBoard('....w....');
	expect(board.availableMoves.length).toBe(48);
	board = new AmazonsGameBoard('b...w....');
	expect(board.availableMoves.length).toBe(37);
});

test('the invalid move exception should be thrown', () => {
	let board = new AmazonsGameBoard('b...w....');
	expect(board.makeMove.bind(board, 'b2', 'c3', 'a1')).toThrow('2,white');
});

test('the end of a game should throw the exception', () => {
	let board = new AmazonsGameBoard('....w....');
	expect(board.makeMove.bind(board, 'b2', 'c3', 'a1')).toThrow('1,black');
});
