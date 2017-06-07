(function (angular) {
	'use strict';

	function configureStates($urlRouterProvider, $locationProvider, angularAuth0Provider) {

		$urlRouterProvider.otherwise('/');

		/* eslint-disable no-undef */
		// Initialization for the angular-auth0 library
		angularAuth0Provider.init({
			clientID: AUTH0_CLIENT_ID,
			domain: AUTH0_DOMAIN,
			responseType: 'token id_token',
			audience: 'https://' + AUTH0_DOMAIN + '/userinfo',
			redirectUri: AUTH0_CALLBACK_URL,
			scope: 'openid profile email',
			leeway: 30
		});
		/* eslint-enable no-undef */

		$urlRouterProvider.otherwise('/');

		$locationProvider.hashPrefix('');

		// Comment out the line below to run the app
		// without HTML5 mode (will use hashes in routes)
		$locationProvider.html5Mode(false);


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
