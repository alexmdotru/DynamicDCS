(function (angular) {
	'use strict';

	function configureStates($urlRouterProvider, $locationProvider, $httpProvider, jwtOptionsProvider, angularAuth0Provider) {

		$urlRouterProvider.otherwise('/');

		/* eslint-disable no-undef */
		// Initialization for the angular-auth0 library
		angularAuth0Provider.init({
			clientID: AUTH0_CLIENT_ID,
			domain: AUTH0_DOMAIN,
			responseType: 'token id_token',
			audience: AUTH0_AUDIENCE,
			redirectUri: AUTH0_CALLBACK_URL,
			scope: REQUESTED_SCOPES,
			leeway: 30
		});

		jwtOptionsProvider.config({
			tokenGetter: function() {
				return localStorage.getItem('access_token');
			},
			whiteListedDomains: ['localhost']
		});

		$httpProvider.interceptors.push('jwtInterceptor');
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
		'$httpProvider',
		'jwtOptionsProvider',
		'angularAuth0Provider'
	];

	angular.module('states', [
		'auth0.auth0',
		'ui.router',
		'state.index',
		'state.dynMap',
		'angular-jwt'
	])
	.config(configureStates)
	.run(['$rootScope', '$state', '$stateParams',
		function ($rootScope, $state, $stateParams) {
			_.set($rootScope, '$state', $state);
			_.set($rootScope, '$stateParams', $stateParams);
		}
	])
}(angular));
