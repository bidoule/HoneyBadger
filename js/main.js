"use strict;"

var Main = Main || {};

Main.parse = function(files, elt) {
	Papa.parse(files[0], {
		delimiter: ";",
		newline: "\n",
		fastMode: true,
		complete: function(results, file) {
			results.data.forEach(handlers[elt.parentNode.dataset.handler]);
		}
	});
}

Main.stopEvent = function(ev) {
	ev.preventDefault();
	ev.stopPropagation();
};

$('.input-drop')
  .on('click', function () {
	$(this).siblings('.input-file').click();
  })
  .on('dragover', Main.stopEvent)
  .on('dragenter', function(ev) {
	Main.stopEvent(ev);
	$(this).addClass('drag-enter');	  
  })
  .on('dragleave', function(ev) {
	Main.stopEvent(ev);
	$(this).removeClass('drag-enter');
  })
  .on('drop', function (ev) {
	Main.stopEvent(ev);
	Main.parse(ev.originalEvent.dataTransfer.files, this);
  });

$('.input-file')
  .on('change', function (ev) {
	Main.stopEvent(ev);
	Main.parse(this.files, this);
	this.value = null;
  });

handlers = {
	'persons': Persons.addPersons,
	'badger': function (d) { console.log('badger', d);},
}