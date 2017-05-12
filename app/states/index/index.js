(function (angular) {
	'use strict';

	function dynamicDCSUIController ($scope, gmapControls) {

		//handle socket events
		$scope.$on('socket:srvUpd', function (ev, data) {
			console.log(data);
		});

		$scope.$on('socket:srvUnitUpd', function (ev, data) {
			console.log(data);
		});

		console.log(gmapControls);
		_.set($scope, 'map', _.get(gmapControls, 'gmapObj'));
	}
	dynamicDCSUIController.$inject = ['$scope', 'gmapService'];

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
		.controller('dynamicDCSUIController', dynamicDCSUIController)
	;
}(angular));
