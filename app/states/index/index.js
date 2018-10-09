(function (angular) {
	'use strict';

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				templateUrl: '/apps/ddcs/states/index/index.tpl.html',
				url: '/'
			})
		;
	}

	function authHandler(authService) {
		authService.handleAuthentication();
	}
	authHandler.$inject = ['authService'];

	angular
		.module('state.index', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(authHandler)
	;
}(angular));
