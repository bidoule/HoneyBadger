"use strict;"

var Persons = Persons || {};

Persons.template = $('#person-template').html();
Mustache.parse(Persons.template);

Persons.$tbody = $('#persons tbody');
new Tablesort(document.getElementById('persons'));

Persons.persons = {};

Persons.addPersons = function(row) {
  var person = new Persons.Person(row);
  if (person.id in Persons.persons) {
    Persons.persons[person.id].update(person);
  } else {
    Persons.persons[person.id] = person;
    Persons.$tbody.append(Mustache.render(Persons.template, person));
  }
}

Persons.addAbsence = function (row) {
	var absence = new Persons.Absence(row);
	if (absence.id in Persons.persons) {
		Persons.persons[person.id].updateAbsence(absence);
	} else {
		addError("Matricule {0} inconnu pour l'absence {1}".format(absence.id, absence.day))
	}
}

Persons.Absence = function (row) {
	this.id = row[0];
	this.day = row[1];
	this.reason = row[2];
	this.minutes = parseInt(parseFloat(row[3]) * 60);
}

Persons.Person = function(row) {
  this.id = row[2];
  var splitId = row[2].split('-');
  this.institution = splitId[0];
  this.number = splitId[1];
  this.lastName = row[0];
  this.firstName = row[1];
  this.name = this.firstName + ' ' + this.lastName;
  this.weeklyHours = {};
  this.weeklyHours[row[4]] = row[3];
  this.absences = {};

  this.update = function(other) {
    if (other.firstName != this.firstName)
	  this.updateError("Le prénom", this.firstName, other.firstName);
    if (other.lastName != this.lastName)
	  this.updateError("Le nom de famille", this.lastName, other.lastName);
    for (var key in other.weeklyHours) {
      if (key in this.weeklyHours && other.weeklyHours[key] != this.weeklyHours[key]) {
        if (key == '')
		  this.updateError("Le taux horaire", this.weeklyHours[key], other.weeklyHours[key]);
        else
		  this.updateError("Le taux horaire de la semaine {0}".format(key), this.weeklyHours[key], other.weeklyHours[key]);
      } 
	  else
	    this.weeklyHours[key] = other.weeklyHours[key];
    }
  };
  
  this.updateError = function(field, thisValue, otherValue) {
	  addError("{0} du matricule {1} diffère : {2}/{3}".format(field, this.id, thisValue, otherValue));
  };
}

$('body').on('click', '#persons tbody tr', function () {
  location.href = this.dataset.target;
});
