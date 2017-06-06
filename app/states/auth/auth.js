(function (angular) {
	'use strict';

	function authController () {
	}
	authController.$inject = [];



	function configFunction($stateProvider) {
		$stateProvider
			.state('auth', {
				controller: 'authController',
				controllerAs: 'authCtrl',
				templateUrl: '/apps/dynamic-dcs/states/auth/auth.tpl.html',
				url: '/Auth'
			})
		;
	}

	angular
		.module('state.authController', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])

		.controller('authController', authController)
	;
}(angular));
