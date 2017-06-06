(function (angular) {
	'use strict';

	function processAuthService($state, authService) {
		authService.handleAuthentication();
		$state.go('index');
	}
	processAuthService.$inject = ['$state','authService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('authCallback', {
				url: '/AuthCallback'
			})
		;
	}

	angular
		.module('state.authCallback', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(processAuthService)
	;
}(angular));
