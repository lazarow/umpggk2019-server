const ColorLogs	= require("color-logs");
module.exports = function(filename) {
	const log = new ColorLogs(true, true, filename);
	log._getDate = function(date) {
		let day = String("00" + date.getDate()).slice(-2),
			month = String("00" + date.getDate()).slice(-2),
			hours = String("00" + date.getHours()).slice(-2),
			minutes = String("00" + date.getMinutes()).slice(-2),
			seconds = String("00" + date.getSeconds()).slice(-2),
			milliseconds = String("000" + date.getMilliseconds()).slice(-3);
		return day +  "/" + month + "/" + date.getFullYear() + ' ' + hours + ':' + minutes + ':'
			+ seconds + '.' + milliseconds;
	};
	log._log = function(argumentsCall) {
		if(this._logEnable)
		{
			var now = new Date();
			var startLog = this._getDate(now) +  ' ';
			if(typeof(argumentsCall[0]) != 'object') {	
				argumentsCall[0] = startLog + argumentsCall[0];
			} else {
				argumentsCall = this._addArgDate(argumentsCall, startLog);
			}
			console.log.apply(console.log, argumentsCall);
		}
	}
	return log;
};
