(function (angular) {
	'use strict';

	function dynamicDCSUIController ($scope, gmapControls) {
		var dd = this;
		_.set(dd, 'appVer', '0.0.1');

		//tabs
		$scope.tabs = [
			{ title:'Dynamic Caucasus', templateUrl: '/tabs/dynamicCaucasus/dynamicCaucasus.tpl.html' },
			{ title:'Dynamic Red Dawn', templateUrl: '/tabs/dynamicRedDawn/dynamicRedDawn.tpl.html' }
		];

		$scope.model = {
			name: 'Tabs'
		};

		//socket.io connectors
		$scope.$on('socket:srvUnitUpd', function (ev, data) {
			console.log('StreamingData');
			_.forEach(data, function(que) {
				gmapControls.processUnitStream(_.get(que, 'curUnit'));
			});
		});
		$scope.$on('socket:error', function (ev, data) {
			console.log(ev, data);
		});
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
		.controller('dynamicDCSUIController', dynamicDCSUIController)
	;
}(angular));
