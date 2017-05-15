(function (angular) {
	'use strict';

	function dynamicDCSController($scope,$state) {
		_.set(this, 'startPage', '/dynamic-dcs.tpl.html');

		$scope.initialise = function() {

			$scope.go = function(state) {
				$state.go(state);
			};

			$scope.tabData   = [
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
			];
		};

		$scope.initialise();
	}
	dynamicDCSController.$inject = ['$scope','$state'];

	angular
		.module('dynamic-dcs', [
			'dynamic-dcs.templates',
			'states',
			'ui.bootstrap',
			'ui.router.tabs'
		])
		.controller('dynamicDCSController', dynamicDCSController)
	;

}(angular));
