(function (angular) {
	'use strict';

	function indexController (userAccountService, DCSUserAccountsAPI, socket) {
		var indxCtrl = this;

		var dread = DCSUserAccountsAPI.query();
		dread.$promise
			.then(function (data) {
				_.set(userAccountService, 'userAccounts', data);
				_.set(userAccountService, 'localAccount', _.find(data, {authId: localStorage.getItem('sub')}));
				socket.emit('room', {
					server: 'leaderboard',
					authId: _.get(userAccountService, ['localAccount', 'authId'])
				});
			})
		;
	}
	indexController.$inject = ['userAccountService', 'dynamic-dcs.api.userAccounts', 'mySocket'];

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
