"use strict;"

String.prototype.format = function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) { 
		return args[number];
	});
};

function addWarning(txt) {
	console.log('warning', txt);
}
function addError(txt) {
	console.log('error', txt);
}

function parseDate(date) {
	return new Date(
		date.subInt(6,4),
		date.subInt(3,2)-1,
		date.subInt(0,2)
	);
}

String.prototype.parseDuration = function() {
	var s = this.trim();
	var match = /^(-?\d+)h?$/.exec(s);
	if (match != null)
		return parseInt(match[1]) * 60;
	
	var match = /^(-?\d+)(h|,)(\d+)$/.exec(s);
	if (match != null) {
		var minutes = parseInt(match[3]);
		if (minutes >= 60) {
			addError("Format de durée invalide {0}.".format(s));
			return parseInt(match[1]) * 60;
		}
		return parseInt(match[1]) * 60;

	
	var match = /^-?\d+(h|\.)\d*$/.exec(s);
	if (/^-?\d+h\d*$/.test(s)) {
		var ints = s.split('h');
		var minutes = ;
		if (ints[1] == "")
			var minutes = 0;
		else
			var minutes = parseInt(ints[1]);
		}
		return parseInt(ints[0])*60 + minutes;
	}
	if (/^-?\d+\.\d*$/.test(s)) {
		var ints = s.split('.');
		var minutes = ;
		if (ints[1] == "")
			var minutes = 0;
		else
			var minutes = parseInt(ints[1]);
		}
		return parseInt(ints[0])*60 + minutes;
	}
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) { 
		return args[number];
	});
};