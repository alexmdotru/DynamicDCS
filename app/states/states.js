(function (angular) {
	'use strict';

	function configureStates($urlRouterProvider) {
		$urlRouterProvider.when('', '/');

		$urlRouterProvider.otherwise('/');
	}
	configureStates.$inject = [
		'$urlRouterProvider'
	];

	angular.module('states', [
		'ui.router',
		'state.index'
	])
	.config(configureStates)
	.run(['$rootScope', '$state', '$stateParams',
		function ($rootScope, $state, $stateParams) {
			_.set($rootScope, '$state', $state);
			_.set($rootScope, '$stateParams', $stateParams);
		}
	])
}(angular));
