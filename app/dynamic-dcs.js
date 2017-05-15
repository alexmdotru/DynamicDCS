(function (angular) {
	'use strict';

	function dynamicDCSController() {
		_.set(this, 'startPage', '/dynamic-dcs.tpl.html');
	}
	dynamicDCSController.$inject = [];

	angular
		.module('dynamic-dcs', [
			'dynamic-dcs.templates',
			'states',
			'ui.bootstrap'
		])
		.controller('dynamicDCSController', dynamicDCSController)
	;

}(angular));
