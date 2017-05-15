(function (angular) {
	'use strict';

	function indexController () {
		console.log('main index and leaderboard');
	}
	indexController.$inject = [];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'ctrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/'
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
		.controller('indexController', indexController)
	;
}(angular));
