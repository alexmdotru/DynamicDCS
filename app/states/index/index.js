(function (angular) {
	'use strict';

	function indexController (authService) {
		// console.log('main index and leaderboard');
		var indxCtrl = this;
		_.set(indxCtrl, 'auth', authService);

		if (authService.getCachedProfile()) {
			_.set(indxCtrl, 'profile', authService.getCachedProfile());
		} else {
			authService.getProfile(function(err, profile) {
				_.set(indxCtrl, 'profile', profile);
			});
		}
	}
	indexController.$inject = ['authService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'indxCtrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
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
			'ui.router',
			'dynamic-dcs.socketFactory',
			'uiGmapgoogle-maps',
			'dynamic-dcs.gmapService'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(authHandler)
		.controller('indexController', indexController)
	;
}(angular));
