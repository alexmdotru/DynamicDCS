(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapControls) {
		console.log('dynCaucasus controller loaded');
		console.log(gmapControls);
		_.set($scope, 'map', _.get(gmapControls, 'gmapObj'));
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
			'ui.router',
			'uiGmapgoogle-maps'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.config(function(uiGmapGoogleMapApiProvider) {
			uiGmapGoogleMapApiProvider.configure({
				key: 'AIzaSyBtYlyyT5iCffhuFc07z8I-fTq6zuWkFjI',
				libraries: 'weather,geometry,visualization'
			});
		})
		.controller('dynCaucasusController', dynCaucasusController)
		.controller('templateController',function(){})
	;
}(angular));
