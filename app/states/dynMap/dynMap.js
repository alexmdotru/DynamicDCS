(function (angular) {
	'use strict';

	function getTheaters (theaterService) {
		return theaterService.getTheaters();
	}
	getTheaters.$inject=['theaterService'];

	function dynMapController($scope, $stateParams, gmapService, mySocket, srvService, theaters) {
		var dmCtrl = this;
		var serverName = $stateParams.name;
		var curTheater = _.get(_.find(_.get(srvService, 'servers'), {name: serverName}), 'theater');
		var theaterObj = _.find(theaters, {name: curTheater});

		_.set(dmCtrl, 'resetMap', function () {
			gmapService.init(serverName, theaterObj);
			_.set($scope, 'map', _.get(gmapService, 'gmapObj'));
		});
		dmCtrl.resetMap();

		//socket.io connectors
		mySocket.emit('room', {
			server: serverName
		});

		mySocket.on('srvUpd', function (data) {
			console.log('sockSrvUpd', data);
		});
		mySocket.on('error', function (err) {
			console.log('sockErr', err);
		});

		mySocket.on('reconnect', function () {
			console.log('sockSrvUpd', data);
			setTimeout(function(){
				dmCtrl.resetMap();
			}, 1000);
		});
	}

	dynMapController.$inject = ['$scope', '$stateParams', 'gmapService', 'mySocket', 'srvService', 'theaters'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('dynMap', {
				controller: 'dynMapController',
				controllerAs: 'dynC',
				templateUrl: '/apps/dynamic-dcs/states/dynMap/dynMap.tpl.html',
				url: '/DynamicMap?name',
				resolve: {
					theaters: getTheaters
				}
			})
		;
	}

	angular
		.module('state.dynMap', [
			'ui.router',
			'dynamic-dcs.api.srvPlayer',
			'dynamic-dcs.api.userAccounts',
			'dynamic-dcs.gmapService'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynMapController', dynMapController)
		.controller('templateController', function () {
		})
	;
}(angular));
