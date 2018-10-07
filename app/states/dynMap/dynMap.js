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
			_.forEach(data, function (queObj) {
				if ((_.get(queObj, 'action') === 'C') || (_.get(queObj, 'action') === 'U') || (_.get(queObj, 'action') === 'D'))  {
					gmapService.processUnitStream(queObj);
				}
			});
			console.log('u: ', data);
		});

		mySocket.on('error', function (err) {
			/* eslint-disable no-console */
			console.log('sockErr', err);
			/* eslint-enable no-console */
		});

		mySocket.on('reconnect', function () {
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
				templateUrl: '/apps/ddcs/states/dynMap/dynMap.tpl.html',
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
			'ddcs.api.srvPlayer',
			'ddcs.api.userAccounts',
			'ddcs.gmapService'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynMapController', dynMapController)
		.controller('templateController', function () {
		})
	;
}(angular));
