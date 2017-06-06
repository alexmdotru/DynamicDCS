(function (angular) {
	'use strict';

	function dynamicDCSController($scope, $state, dynMsgService, authService) {
		_.set(this, 'startPage', '/dynamic-dcs.tpl.html');

		_.set($scope, 'auth', authService);

		console.log(authService);

		$scope.initialise = function() {

			_.set($scope, 'isCollapsed', true);
			_.set($scope, 'go', function(state) {
				$state.go(state);
			});
			_.set($scope, 'tabData', [
				{
					heading: 'Leaderboard',
					route:   'index'
				},
				{
					heading: 'DynamicCaucasus',
					route:   'dynCaucasus'
				},
				{
					heading: 'DynamicRedDawn',
					route:   'dynRedDawn'
				}
			]);
			_.set($scope, 'cObj', _.get(dynMsgService, 'cObj'));
		};

		$scope.initialise();
	}
	dynamicDCSController.$inject = ['$scope','$state', 'dynMsgService', 'authService'];

	angular
		.module('dynamic-dcs', [
			'dynamic-dcs.templates',
			'dynamic-dcs.dynMsgService',
			'dynamic-dcs.chat-box',
			'states',
			'ui.bootstrap',
			'dynamic-dcs.authService'
		])
		.config(['$qProvider', function ($qProvider) {
			$qProvider.errorOnUnhandledRejections(false);
		}])
		.controller('dynamicDCSController', dynamicDCSController)
	;

}(angular));
