(function (angular) {
	'use strict';

	function dynRedDawnController () {
		console.log('dynRedDawn controller loaded');
		/*
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
		*/
	}
	dynRedDawnController.$inject = [];

	function configFunction($stateProvider) {
		$stateProvider
			.state('dynRedDawn', {
				controller: 'dynRedDawnController',
				controllerAs: 'dynRD',
				templateUrl: '/apps/dynamic-dcs/states/dynRedDawn/dynRedDawn.tpl.html',
				url: '/DynamicRedDawn'
			})
		;
	}

	angular
		.module('state.dynRedDawn', [
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
		.controller('dynRedDawnController', dynRedDawnController)
	;
}(angular));
