(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapControls) {
		console.log('dynCaucasus controller loaded');

		//socket.io connectors
		$scope.$on('socket:srvUpd', function (ev, data) {
			//console.log('StreamingDataForCaucasus',data);
			_.forEach(data, function(que) {
				gmapControls.processUnitStream(_.get(que, 'curUnit'));
			});
		});
		$scope.$on('socket:error', function () {
			// console.log(ev, data);
		});
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
			'dynamic-dcs.socketFactory',
			'uiGmapgoogle-maps',
			'dynamic-dcs.gmapService'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.config(function(uiGmapGoogleMapApiProvider) {
			uiGmapGoogleMapApiProvider.configure({
				key: 'AIzaSyBtYlyyT5iCffhuFc07z8I-fTq6zuWkFjI',
				libraries: 'weather,geometry,visualization'
			});
		})
		.controller('dynCaucasusController', dynCaucasusController)
	;
}(angular));
