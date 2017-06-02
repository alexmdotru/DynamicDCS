(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapControls, uiGmapIsReady, uiGmapGoogleMapApi, $http, dynMsgService) {
		// console.log('dynCaucasus controller loaded');
		var dynC = this;

		$http.get('json/overlayCoords.json').then(function(overlayCoordsJSON) {
			_.set(dynC, 'overlayCoords', overlayCoordsJSON.data);


			_.set($scope, 'map', _.get(gmapControls, 'gmapObj'));
			uiGmapIsReady.promise(1).then(function (maps) {
				$scope.currentMap = maps[0].map;
				uiGmapGoogleMapApi.then(function (googleMaps) {
					_.forOwn(dynC.overlayCoords, function (bObj, base) {
						console.log('forOwn: ',bObj, base, dynMsgService.cObj.bases[base]);
						var imageBounds = new googleMaps.LatLngBounds(
							new googleMaps.LatLng(bObj.lat1, bObj.lng1),
							new googleMaps.LatLng(bObj.lat2, bObj.lng2));
						console.log(imageBounds, 'imgs/mapOverlays/'+base+'_'+dynMsgService.cObj.bases[base]+'.png'); //'+dynMsgService.cObj.bases[base]+'
						$scope.historicalOverlay = new googleMaps.GroundOverlay( 'imgs/mapOverlays/'+base+'_1.png',imageBounds);
						$scope.historicalOverlay.setMap($scope.currentMap);
						console.log($scope.historicalOverlay);
					});
				});
			});
		});
	}
	dynCaucasusController.$inject = ['$scope', 'gmapService', 'uiGmapIsReady', 'uiGmapGoogleMapApi', '$http', 'dynMsgService'];

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
