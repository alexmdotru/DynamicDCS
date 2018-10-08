(function (angular) {
	'use strict';

	function indexController (srvService, mySocket, eventService) {
		var indxCtrl = this;
		_.set(indxCtrl, 'srvService', srvService);
		_.set(indxCtrl, 'eventService', eventService);

		mySocket.emit('room', {
			server: 'index'
		});

		mySocket.on('srvUpd', function (data) {
			console.log('IData: ', data);
		});
	}
	indexController.$inject = ['srvService', 'mySocket', 'eventService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'indxCtrl',
				templateUrl: '/apps/ddcs/states/index/index.tpl.html',
				url: '/',
				bindToController: true
			})
		;
	}

	function authHandler(authService) {
		authService.handleAuthentication();
	}
	authHandler.$inject = ['authService'];

	angular
		.module('state.index', [
			'ui.router',
			'highcharts-ng'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(authHandler)
		.controller('indexController', indexController)
	;
}(angular));
