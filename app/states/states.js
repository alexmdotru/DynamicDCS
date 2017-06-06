(function (angular) {
	'use strict';

	function configureStates($urlRouterProvider, $locationProvider) {

		$locationProvider.html5Mode(false);
		$locationProvider.hashPrefix('!');
		$urlRouterProvider.when('', '/');
		$urlRouterProvider.otherwise('/');
	}
	configureStates.$inject = [
		'$urlRouterProvider',
		'$locationProvider'
	];

	angular.module('states', [
		'ui.router',
		'state.index',
		'state.dynCaucasus',
		'state.dynRedDawn'
	])
	.config(configureStates)
	.run(['$rootScope', '$state', '$stateParams',
		function ($rootScope, $state, $stateParams) {
			_.set($rootScope, '$state', $state);
			_.set($rootScope, '$stateParams', $stateParams);
		}
	])
}(angular));
