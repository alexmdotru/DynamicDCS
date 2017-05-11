(function (angular) {
	'use strict';

	function dynamicDCSUIController () {

	}
	dynamicDCSUIController.$inject = [];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'dynamicDCSUIController',
				controllerAs: 'ctrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/?mapName'
			})
		;
	}

	angular
		.module('state.index', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynamicDCSUIController', dynamicDCSUIController)
	;
}(angular));
