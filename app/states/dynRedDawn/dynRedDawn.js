(function (angular) {
	'use strict';

	function dynRedDawnController () {
		// console.log('dynRedDawn controller loaded');
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
}(angular))
