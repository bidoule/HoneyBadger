var HoneyBadger = HoneyBadger || {};

var error_template = $('#error-template').html();
Mustache.parse(error_template);

var template = $('#template').html();
Mustache.parse(template);

mats = {};

Date.prototype.getIsoDay = function() {
	return 1 + (this.getDay() + 6) % 7;
};

Date.prototype.getIsoWeek = function () {
	var year = this.getFullYear();
	var day = this.getIsoDay();
	if (this.getMonth() == 11 && this.getDate() >= 28 + day)
		return [year+1, 1, day];
	var jan4 = new Date(year, 0, 4);
	var day_offset = jan4.getIsoDay() - day;
	var minute_offset = jan4.getTimezoneOffset() - this.getTimezoneOffset();
	return [year, 1 + (this - jan4 + day_offset*86400000 + minute_offset*60000)/604800000];
};

function getDefault(map, key, val) {
	if (!(key in map))
		map[key] = val;
	return map[key];
}

String.prototype.subInt = function (start, end) {
	return parseInt(this.substr(start, end), 10);
};

function parseDate(date) {
	return new Date(
		date.subInt(6,4),
		date.subInt(3,2)-1,
		date.subInt(0,2)
	);
};

function parseTime(time) {
	var t = time.split(',');
	return [parseInt(t[0]), parseInt(t[1])];
}
function parseType(type) {
	return 3-2*parseInt(type);
}

function parseLine(row) {
	var weeks = getDefault(mats, row[0], {});
	
	var date = parseDate(row[0]);
	var isoWeek = date.getIsoWeek();
	
	var week = getDefault(weeks, isoWeek, {});
	var date = getDefault(week, date, [])
	
	date.push([parseTime(row[2]), parseType(row[3])]);
}

function parseCSV(text, parseLine) {
	text.slice(0, -1).split('\n').forEach(function (line) {
		parseLine(line.split(';'));
	});
};

HoneyBadger.parseLine = function(row) {
	if (!(row[0] in HoneyBadger.mats))
		HoneyBadger.mats[row[0]] = {};
	var dates = HoneyBadger.mats[row[0]];
	
	if (!(row[1] in dates))
		dates[row[1]] = [];
	var date = dates[row[1]];
	
	date.push([parseTime(row[2]), parseType(row[3])]);
};

addError = function(mat, date, msg, level) {
	var rendered = Mustache.render(error_template, {
		'mat': mat,
		'date': date,
		'msg': msg,
		'level': level,
	});
	$('#errors tbody').append(rendered);
};

keySort = function(v) {
	return v[0][0]*60 + v[0][1];
}

timeFormat = function(t) {
	return "" + t[0][0] + "h" + t[0][1].pad();
}



checkMat = function() {
	var hasError = false;
	for (var mat in HoneyBadger.mats) {
		var dates = HoneyBadger.mats[mat];
		for (date in dates) {
			var inOut = dates[date];
			inOut.sort(function (a, b) {
				return keySort(a) - keySort(b);
			});
			var sum = 0;
			var start_time = 0;
			for (var i=0; i<inOut.length; ++i) {
				sum += inOut[i][1];
				if (sum > 1) {
					addError(mat, date, "Deux entrées consécutives.", "danger");
					sum = 0;
					hasError = true;
					break;
				} else if (sum < 0) {
					addError(mat, date, "Deux sorties consécutives.", "danger");
					sum = 0;
					hasError = true;
					break;
				}
				if (inOut[i][1] == 1) {
					start_time = inOut[i];
				} else {
					var workedMinutes = keySort(inOut[i]) - keySort(start_time);
					if (workedMinutes > 390) {
						var hours = parseInt(workedMinutes/60);
						var minutes = workedMinutes % 60;
						addError(mat, date, "Travaillé pendant " + hours + "h" + minutes.pad() + ".", "warning");
						hasError = true;
					};
				}
			};
			if (sum != 0) {
				addError(mat, date, "Nombre impair de mouvements.", "danger");
				hasError = true;
			};
		};
	};
	if (hasError)
		$('#errors').show();
	return hasError;
};

showMat = function() {
	var mats = [];
	for (var mat in HoneyBadger.mats) {
		var uweeks = {};
		var dates = HoneyBadger.mats[mat];
		for (date in dates) {
			var rdate = parseDate(date);
			var format = rdate.format();
			var iso = rdate.getIsoWeekDate();
			var name = "" + iso[0] + " - Semaine n°" + iso[1];
			if (!(name in uweeks))
				uweeks[name] = [];
			var week = uweeks[name];
			week[format] = [];
			var inOut = dates[date];
			var inouts = [];
			for (var i=0; 2*i<inOut.length; ++i) {
				inouts.push({
					'in': timeFormat(inOut[2*i]),
					'out':  timeFormat(inOut[2*i+1])
				});
			};
			week.push({
				date: format,
				inouts: inouts
			})
		};
		
		var weeks = []
		for (week in uweeks) {
			weeks.push({ week: week, dates: uweeks[week]})
		};
		weeks.sort(function (a, b) {return (a.week < b.week);});
		
		mats.push({
			'mat': mat,
			'weeks': weeks,
		})
	};
	var rendered = Mustache.render(template, {
		'mats': mats,
	});
	$('#main').append(rendered);
};

Number.prototype.pad = function() {
	return ("0" + this).slice(-2);
};

Date.prototype.days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
Date.prototype.months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

Date.prototype.format = function() {
	return this.days[this.getDay()] + ' ' + this.getDate() + ' ' + this.months[this.getMonth()];
};


$(document).ready(function () {
	$('#input').change(function () {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = function(e) {
			parseCSV(reader.result);
		};
		reader.readAsText(file);
	});
});