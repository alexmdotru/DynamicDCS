(function (angular) {
	'use strict';

	function dynamicDCSController($scope,$state) {
		_.set(this, 'startPage', '/dynamic-dcs.tpl.html');

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
		};

		$scope.initialise();
	}
	dynamicDCSController.$inject = ['$scope','$state'];

	angular
		.module('dynamic-dcs', [
			'dynamic-dcs.templates',
			'states',
			'ui.bootstrap'
		])
		.controller('dynamicDCSController', dynamicDCSController)
	;

}(angular));
