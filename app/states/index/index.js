(function (angular) {
	'use strict';

	function dynamicDCSUIController ($scope, uiGmapGoogleMapApi) {


		//$scope.map = { center: { latitude: 45, longitude: -73 }, zoom: 8 };
		$scope.map = {
			center: {
				latitude: 43.4275113,
				longitude: 41.2920366
			},
			zoom: 8,
			markers: [],
			events: {
				click: function (map, eventName, originalEventArgs) {
					var e = originalEventArgs[0];
					var lat = e.latLng.lat(),
						lon = e.latLng.lng();
					var marker = {
						id: Date.now(),
						coords: {
							latitude: lat,
							longitude: lon
						}
					};
					$scope.map.markers.push(marker);
					console.log($scope.map.markers);
					$scope.$apply();
				}
			}
		};
	}

	dynamicDCSUIController.$inject = ['$scope'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'dynamicDCSUIController',
				controllerAs: 'ctrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/?mapName'
			})
		;
	}

	angular
		.module('state.index', [
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
		.controller('dynamicDCSUIController', dynamicDCSUIController)
	;
}(angular));
