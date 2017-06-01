(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapControls, uiGmapIsReady, uiGmapGoogleMapApi) {
		// console.log('dynCaucasus controller loaded');
		_.set($scope, 'map', _.get(gmapControls, 'gmapObj'));

		var imageBounds = {north: 40.773941, south: 40.712216, east: -74.12544, west: -74.22655};
		//$scope.historicalOverlay = new google.maps.GroundOverlay( 'https://www.lib.utexas.edu/maps/historical /newark_nj_1922.jpg',imageBounds);
		uiGmapIsReady.promise(1).then(function (maps) {
			$scope.currentMap = maps[0].map;
			//$scope.historicalOverlay.setMap($scope.currentMap);

			uiGmapGoogleMapApi.then(function (googleMaps) {
				//console.log(googleMaps);
				//var imageBounds = {north: 41.6129410, south: 41.59566182, east: 41.634134, west: 41.58429107};
				var imageBounds = new googleMaps.LatLngBounds(
					new googleMaps.LatLng(41.59687897449084, 41.58176701846196),
					new googleMaps.LatLng(41.62282934176421, 41.62036918520812));
				$scope.historicalOverlay = new googleMaps.GroundOverlay( 'imgs/mapOverlays/Batumi_Blue.png',imageBounds);
				$scope.historicalOverlay.setMap($scope.currentMap);
			});
		});
	};
	dynCaucasusController.$inject = ['$scope', 'gmapService', 'uiGmapIsReady', 'uiGmapGoogleMapApi'];

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
