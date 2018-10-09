(function (angular) {
	'use strict';

	function configFunction($stateProvider) {
		$stateProvider
			.state('comms', {
				templateUrl: '/apps/ddcs/states/comms/comms.tpl.html',
				url: '/Communications'
			})
		;
	}

	angular
		.module('state.comms', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
	;
}(angular));
