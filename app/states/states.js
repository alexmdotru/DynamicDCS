(function (angular) {
	'use strict';

	function configureStates($urlRouterProvider, $locationProvider, angularAuth0Provider) {
		angularAuth0Provider.init({
			clientID: '3TPd6XVVFb2g3BhjppKdCz5X8q4Mraek',
			domain: 'afinegan.auth0.com',
			responseType: 'token id_token',
			audience: 'https://afinegan.auth0.com/userinfo',
			redirectUri: 'http://127.0.0.1:8080/#!/AuthCallback',
			scope: 'openid',
			leeway: 30
		});

		$urlRouterProvider.when('', '/');
		$urlRouterProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: true,
			requireBase: false
		});


	}
	configureStates.$inject = [
		'$urlRouterProvider',
		'$locationProvider',
		'angularAuth0Provider'
	];

	angular.module('states', [
		'auth0.auth0',
		'ui.router',
		'state.index',
		'state.dynCaucasus',
		'state.dynRedDawn',
		'state.authCallback'
	])
	.config(configureStates)
	.run(['$rootScope', '$state', '$stateParams',
		function ($rootScope, $state, $stateParams) {
			_.set($rootScope, '$state', $state);
			_.set($rootScope, '$stateParams', $stateParams);
		}
	])
}(angular));
