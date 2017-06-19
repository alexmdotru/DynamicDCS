(function (angular) {
	'use strict';

	function dynMapController ($scope, $stateParams, gmapService) {
		// console.log('dynCaucasus controller loaded');
		//future this can retrieve the right map object for the correct map
		console.log($stateParams);

		_.set($scope, 'map', _.get(gmapService, 'gmapObj'));
	}
	dynMapController.$inject = ['$scope', '$stateParams', 'gmapService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('dynMap', {
				controller: 'dynMapController',
				controllerAs: 'dynC',
				templateUrl: '/apps/dynamic-dcs/states/dynMap/dynMap.tpl.html',
				url: '/DynamicMap?name'
			})
		;
	}

	angular
		.module('state.dynMap', [
			'ui.router'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynMapController', dynMapController)
		.controller('templateController',function(){})
	;
}(angular));
