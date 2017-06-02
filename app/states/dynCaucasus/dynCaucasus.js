(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapService) {
		// console.log('dynCaucasus controller loaded');
		var dynC = this;
		//future this can retrieve the right map object for the correct map
		_.set($scope, 'map', _.get(gmapService, 'gmapObj'));
	}
	dynCaucasusController.$inject = ['$scope', 'gmapService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('dynCaucasus', {
				controller: 'dynCaucasusController',
				controllerAs: 'dynC',
				templateUrl: '/apps/dynamic-dcs/states/dynCaucasus/dynCaucasus.tpl.html',
				url: '/DynamicCaucasus'
			})
		;
	}

	angular
		.module('state.dynCaucasus', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynCaucasusController', dynCaucasusController)
		.controller('templateController',function(){})
	;
}(angular));
