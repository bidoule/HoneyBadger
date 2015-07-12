var HoneyBadger = HoneyBadger || {};

var errorTemplate = $('#error-template').html();
Mustache.parse(errorTemplate);

var template = $('#template').html();
Mustache.parse(template);

var helperTemplate = $('#helper-template').html();
Mustache.parse(helperTemplate);

var people = {};
var mats = {};

var hasError = false;
var hasWarning = false;

var ignoreList = [];

Date.prototype.getIsoDay = function() {
	return 1 + (this.getDay() + 6) % 7;
};

Date.prototype.getIsoWeek = function () {
	var year = this.getFullYear();
	var day = this.getIsoDay();
	if (this.getMonth() == 11 && this.getDate() >= 28 + day)
		return (year+1).pad(4) + '-W01';
	var jan4 = new Date(year, 0, 4);
	var day_offset = jan4.getIsoDay() - day;
	var minute_offset = jan4.getTimezoneOffset() - this.getTimezoneOffset();
	return year.pad(4) + '-W' + (1 + (this - jan4 + day_offset*86400000 + minute_offset*60000)/604800000).pad(2);
};
Date.prototype.getIsoCalendar = function () {
	return this.getFullYear().pad(4) + '-' + (this.getMonth()+1).pad(2) + '-' + this.getDate().pad(2);
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
}

function parseTimeType(time, type) {
	var times = time.split(',');
	return {
		hour: parseInt(times[0]),
		minute: parseInt(times[1]),
		type: 3-2*parseInt(type)
	};
}

function parseBadger(line) {
	var row = line.split(';');
	var weeks = getDefault(mats, row[0], {});
	
	var date = parseDate(row[1]);
    var allDays = [];

	var isoWeek = date.getIsoWeek();
	var isoCal = date.getIsoCalendar();
	
	var week = getDefault(weeks, isoWeek, {});
    var allDate = new Date(date.getTime());
    allDate.setDate(allDate.getDate()-date.getIsoDay());
    for (var i=0; i<7; ++i) {
        allDate.setDate(allDate.getDate() + 1);
        getDefault(week, allDate.getIsoCalendar(), []);
    }
	var weekDate = getDefault(week, isoCal, []);
	
	weekDate.push(parseTimeType(row[2], row[3]));
}

function parsePeople(line) {
	var row = line.split(';');
    var max_hour = parseInt(row[3]);
    var mat = row[2];
	people[mat] = {
		firstName: row[1],
		lastName: row[0],
		name: row[1] + ' ' + row[0],
		max_hour: max_hour
	}
    if (max_hour > 35) {
        addWarning(mat, "", "Plus de 35 heures", "danger");
        hasWarning = true;
    }
}

function parseCSV(text, fun) {
	text.split('\n').forEach(function (r) {
        if (r != '')
            fun(r);
    });
	if (hasError)
		$('#errors').show();
    if (hasWarning)
		$('#warnings').show();
}

function compare(f) {
	return function(a, b) {
		return f(a) - f(b);
	};
}
function keyInOut(x) {
	return x.hour*60 + x.minute;
}

Number.prototype.intdiv = function (x) {
	return {
		'div': parseInt(this/x),
		'mod': this % x
	};
};
Number.prototype.pad = function(x) {
	return (Array(x).join("0") + this).slice(-x);
};



addAlert = function(mat, date, msg, level, elt) {
	var rendered = Mustache.render(errorTemplate, {
		'mat': mat,
        'name': people[mat].name,
		'date': (date == '') ? '-' : date.slice(8,10) + '/' + date.slice(5,7) + '/' + date.slice(0,4),
		'msg': msg,
		'level': level
	});
	elt.find('tbody').append(rendered);
};

addWarning = function(mat, date, msg, level) {
    addAlert(mat, date, msg, level, $('#warnings'));
}

addError = function(mat, date, msg, level) {
    addAlert(mat, date, msg, level, $('#errors'));
}


function compareMats(a, b) {
    var d = parseInt(a) - parseInt(b);
    if (d != 0)
        return d;
    var sa = people[a];
    var sb = people[b];
    d = sa.lastName.localeCompare(sb.lastName);
    if (d != 0)
        return d;
    return sa.firstName.localeCompare(sb.firstName);
}


function check() {
	var matsKeys = Object.getOwnPropertyNames(mats).sort(compareMats);
	for (var imat=0; imat<matsKeys.length; ++imat) {
		var mat = matsKeys[imat];
		var weeks = mats[mat];
		var weeksKeys = Object.getOwnPropertyNames(weeks).sort();
		for (var iweek=0; iweek<weeksKeys.length; ++iweek) {
			var week = weeksKeys[iweek];
			var dates = weeks[week];
			var datesKeys = Object.getOwnPropertyNames(dates).sort();
			for (var idate=0; idate<datesKeys.length; ++idate) {
				var date = datesKeys[idate];
				var inOuts = dates[date];
				inOuts.sort(compare(keyInOut));
				var sum = 0;
				var startTime;
				for (var i=0; i<inOuts.length; ++i) {
					var inOut = inOuts[i];
					
					// On vérifie que l'employé n'a pas trop travaillé ou pas assez :)
					if (inOut.type == 1) {
						startTime = keyInOut(inOut);
					} else {
						var workedMinutes = keyInOut(inOut) - startTime;
						if (workedMinutes > 390) {
							addWarning(mat, date, toTime(workedMinutes) + " travaillées.", (workedMinutes > 480) ? "danger": "warning");
						} else if (workedMinutes < 5) {
							addWarning(mat, date, "Seulement " + workedMinutes + " minute" + ((workedMinutes == 1) ? " travaillée":"s travaillées"), "danger");
                        }
                        hasWarning = true;
					}
					
					sum += inOut.type;
					// On vérifie qu'il n'y a pas eu deux entrées ou sorties consécutives
					if (sum > 1 || sum < 0) {
						addError(mat, date, "Deux " + ((sum > 1) ? "entrées" : "sorties") + " consécutives.", "danger");
                        ignoreList.push(mat);
						sum = 0;
						hasError = true;
						break;
					}
				}
				
				// On vérifie qu'il y a eu un nombre pair de mouvements.
				if (sum !== 0) {
                    console.log(mat, date, inOuts, date);
					addError(mat, date, "Nombre impair de mouvements.", "danger");
                    ignoreList.push(mat);
					hasError = true;
				}
				
				// On vérifie qu'il n'y a pas eu trop de mouvements
				if (inOuts.length > 6) {
					addWarning(mat, date, "Plus de 6 mouvements.", "danger");
					hasWarning = true;
				} else if (inOuts.length > 4) {
					addWarning(mat, date, "Plus de 4 mouvements.", "warning");
					hasWarning = true;
				}
			}
		}
	}
	
	if (hasError)
		$('#errors').show();
    if (hasWarning)
		$('#warnings').show();
}

function timeFormat(t) {
	return '' + t.hour + 'h' + t.minute.pad(2);
}
function toTime(i) {
	var t = i.intdiv(60);
	return timeFormat({hour: t.div, minute: t.mod});
}
function toWeek(w) {
	return 'Semaine n°' + w.slice(6, 8);
}
function toDate(date) {
	var d = new Date(
		date.subInt(0,4),
		date.subInt(5,7)-1,
		date.subInt(8,10)
	);
	return d.days[d.getDay()] + ' ' + d.getDate() + ' ' + d.months[d.getMonth()];
}

Date.prototype.days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
Date.prototype.months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function overNumber(t) {
    return (t/60.).toFixed(2);
}

function overlist(a, time) {
    var val = a[0][0] - time;
    if (val > 0)
        return [{class: 'minus', text: toTime(time), number: overNumber(time), minutes: time}];
    if (val == 0)
        return [{class: 'perfect', text: "perfect", number: '-', minutes: time}];
    var b = [{class: 'normal', text: toTime(a[0][0]), number: overNumber(a[0][0]), minutes: a[0][0]}];
    var i = 1;
    while (i < a.length && time > a[i][0]) {
        var val = a[i][0] - a[i-1][0];
        b.push({class: a[i-1][1], text: "+" + toTime(val), number: overNumber(val), minutes: val})
        ++i;
    };
    var val = time - a[i-1][0];
    b.push({class: a[i-1][1], text: "+" + toTime(val), number: overNumber(val), minutes: val});
    return b;
}

function overtime(mat, time) {
    var l;
    var max_hour = people[mat].max_hour;
    if (max_hour == 35) {
        l = [[2100, 'medium'], [2580, 'high']];
    } else {
        var max_minute = max_hour * 60;
        var maj = max_hour * 60 * 110 / 100;
        l = [[max_minute, 'low'], [Math.min(2100, maj), 'medium'], [2580, 'high']];
    }
    return overlist(l, time)
}

Number.prototype.round15 = function() {
    var x = this + 7;
    return x - x%15;
}

var formatClass = {
    normal: '',
    low: ' +10%',
    medium: ' +25%',
    high: ' +50%',
}

function formatOvertimes(ots) {
    var l = ['normal', 'low', 'medium', 'high'];
    var a = [];
    for (var k=0; k<l.length; ++k) {
        if (ots.hasOwnProperty(l[k]))
            a.push({
                class: l[k],
                text: toTime(ots[l[k]]),
                number: overNumber(ots[l[k]]) + formatClass[l[k]],
            });
    }
    return a;
}

function output() {
	var matsKeys = Object.getOwnPropertyNames(mats).sort(compareMats);
	var omats = [];
	for (var imat=0; imat<matsKeys.length; ++imat) {
		var mat = matsKeys[imat];
        if (ignoreList.indexOf(mat) > -1)
            continue;
		var weeks = mats[mat];
		var weeksKeys = Object.getOwnPropertyNames(weeks).sort();
		var oweeks = [];
        var overtimes = {};
		var mat_sum = 0;
		for (var iweek=0; iweek<weeksKeys.length; ++iweek) {
			var week = weeksKeys[iweek];
			var dates = weeks[week];
			var odates = [];
			var datesKeys = Object.getOwnPropertyNames(dates).sort();
			var week_sum = 0;
			for (var idate=0; idate<datesKeys.length; ++idate) {
				var date = datesKeys[idate];
				var inOuts = dates[date];
				var oInOut = [];
				var date_sum = 0;
				for (var i=0; 2*i<inOuts.length; ++i) {
					var tin = inOuts[2*i];
					var tout = inOuts[2*i+1];
					oInOut.push({
						'in': timeFormat(tin),
						'out':  timeFormat(tout)
					});
					date_sum += 60*(tout.hour - tin.hour) + tout.minute - tin.minute;
				}
				odates.push({
					dateID: date,
					date: toDate(date),
					sum: (date_sum == 0) ? '' : toTime(date_sum),
					inouts: oInOut
				});
				week_sum += date_sum;
			}
            var roundWeekSum = week_sum.round15();
            var ot = overtime(mat, roundWeekSum);
			oweeks.push({
				weekID: week,
				week: toWeek(week),
				osum: toTime(week_sum),
				sum: toTime(roundWeekSum),
				dates: odates,
                overtime: ot,
			});
			mat_sum += week_sum;
            if (ot[0].class == 'perfect' || ot[0].class == 'minus') {
                getDefault(overtimes, 'normal', 0);
                overtimes['normal'] += roundWeekSum;
            } else {
                for (var k=0; k<ot.length; ++k) {
                    getDefault(overtimes, ot[k].class, 0);
                    overtimes[ot[k].class] += ot[k].minutes;
                }
            }
		}
		omats.push({
			mat: mat,
			people: people[mat].name,
			sum: toTime(mat_sum),
            max_hour: toTime(people[mat].max_hour * 60),
            overtimes: formatOvertimes(overtimes),
			weeks: oweeks,
		});
		var helpRendered = Mustache.render(helperTemplate, {mat: mat, name: people[mat].name});
		$('#helper').append(helpRendered);
	}
	var rendered = Mustache.render(template, {mats: omats});
	$('#main').append(rendered);
	return omats;
}

function handleBadger(files) {
	var file = files[0];
	var reader = new FileReader();
	reader.onload = function(e) {
		parseCSV(reader.result, parseBadger);
		check();
        output();
        $('#main').show();
		$('body').css('cursor', 'default');
		$('#drag-badger')
		  .removeClass('drag-wait')
		  .addClass('drag-ok');
	};
	reader.readAsText(file);
}

function handleMat(files) {
	var file = files[0];
	var reader = new FileReader();
	reader.onload = function(e) {
		parseCSV(reader.result, parsePeople);
		$('body').css('cursor', 'default');
		$('#drag-mat')
		  .removeClass('drag-wait')
		  .addClass('drag-ok');
	};
	reader.readAsText(file);
}

var handlers = {
	badger: handleBadger,
	mat: handleMat
}

function newValue(elt) {
    return function() {
        elt.html($(this).val());
    };
}

function changeValue(ev) {
    ev.preventDefault();
	ev.stopPropagation();
    var $this = $(this);
    var txt = $this.text();
    $this.html(
        $('<input>')
            .val(txt)
            .blur(newValue($this))
    );
    $this.find('input').focus();
}


$(document).ready(function () {
	$('.input-file').change(function() {
		handlers[this.dataset.handler](this.files);
	});

    $('body').on('click', '.editable', changeValue);
	
	$('.input-drag')
	  .on('click', function() {
		$(this.dataset.target).click();
	  })
	  .on('dragover', function(ev) {
		ev.preventDefault();  
		ev.stopPropagation(); 
	  })
	  .on('dragenter', function(ev) {
		ev.preventDefault();  
		ev.stopPropagation();
		$(this).addClass('drag-enter');	  
	  })
	  .on('dragleave', function(ev) {
		ev.preventDefault();  
		ev.stopPropagation();
		$(this).removeClass('drag-enter');
	  })
	  .on('drop', function(ev) {
		ev.preventDefault();  
		ev.stopPropagation();
     	$(this)
		  .off('click').off('dragover').off('dragenter').off('dragleave').off('drop')
		  .removeClass('drag-enter')
		  .addClass('drag-wait');
		$('body').css('cursor', 'wait');
		handlers[this.dataset.handler](ev.originalEvent.dataTransfer.files);
	  });
});
