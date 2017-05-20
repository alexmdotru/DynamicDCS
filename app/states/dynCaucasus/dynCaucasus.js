(function (angular) {
	'use strict';

	function dynCaucasusController ($scope, gmapControls) {
		console.log('dynCaucasus controller loaded');

		var cObj = {};
		_.set(cObj, 'players', {self: {}, });
		_.set(cObj, 'msgs', {
			que: []
		});

		//socket.io connectors
		$scope.$on('socket:srvUpd', function (ev, data) {
			console.log(data.que);
			//console.log('StreamingDataForCaucasus',data);
			_.forEach(data.que, function(que) {
				if (que.action === 'INIT' || que.action === 'C' || que.action === 'U' || que.action === 'D') { //send map updates
					gmapControls.processUnitStream(que);
				}else if (que.action === 'players') { //player
					console.log('PLAYER: ', que.action, que.data);
					_.set(cObj, 'players', que.data);
				}else if (que.action === 'MESG') { //send mesg
					console.log('MESG: ', que.action, que.data)
				}else if (que.action === 'CMD') { //send command responses
					console.log('CMD: ', que.action, que.data)
				} else {
					console.log('EVENT', que.action, que.data)
				}
			});
		});
		$scope.$on('socket:error', function () {
			//console.log(ev, data);
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
