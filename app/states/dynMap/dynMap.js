(function (angular) {
	'use strict';

	function dynMapController ($scope, $stateParams, gmapService, socket) {
		var dmCtrl = this;
		socket.on('connect', function () {
			//init vars on connect
			_.set(dmCtrl, 'mObj', {
				client: {},
				units: [],
				bases: [],
				overlays: [],
				players: [],
				chatMsgs: [],
				cmds: [],
				events: [],
				eventMsgs: []
			});
			// join page room, find out what side there suppose to be on, or set them as neutral
			socket.emit('room', $stateParams.name+'_q2');
			// init data
			gmapService.resetMarkers($stateParams.name);
			socket.emit('clientUpd', { name: $stateParams.name, action: 'unitINIT' });
		});

		//socket.io connectors
		socket.on('srvUpd', function (data) {
			console.log(data);
			_.forEach(data.que, function(que) {
				if (que.action === 'INIT' || que.action === 'C' ||
					que.action === 'U' || que.action === 'D') {
					if(que.action === 'C' || que.action === 'INIT') {
						if (typeof _.find(_.get(dmCtrl, 'mObj.units'),
								{ 'unitID': _.get(que, 'data.unitID') }) !== "undefined") {
							_.find(_.get(dmCtrl, 'mObj.units'),
								{ 'unitID': _.get(que, 'data.unitID') }).action = 'U';
						}
					}
					if(que.action === 'U') {
						if(!_.find(_.get(dmCtrl, 'mObj.units'),
								{'unitID': _.get(que, 'data.unitID')})){
							_.set(dmCtrl, 'mObj.units', []);
							gmapService.resetMarkers();
							socket.emit('clientUpd', { name: $stateParams.name, action: 'unitINIT' });
						}else{
							_.find(_.get(dmCtrl, 'mObj.units'),
								{'unitID': _.get(que, 'data.unitID')}).lat = _.get(que, 'data.lat');
							_.find(_.get(dmCtrl, 'mObj.units'),
								{'unitID': _.get(que, 'data.unitID')}).lon = _.get(que, 'data.lon');
							gmapService.processUnitStream(que);
						}
					}else{
						//send map updates
						dmCtrl.mObj.units.push(_.get(que, 'data'));
						gmapService.processUnitStream(que);
					}
				}else if (que.action === 'reset') { //spectator
					_.set(dmCtrl, 'mObj.units', []);
					gmapService.resetMarkers();
				}else if (que.action === 'players') { //player
					var curPObj = [];
					_.forEach(que.data, function (player) {
						if ( typeof player !== "undefined"){
							curPObj.push(player);
						}
					});
					_.set(dmCtrl, 'mObj.players', curPObj);
				}else if (que.action === 'MESG') { //send mesg
					_.set(que, 'data.name',
						_.find(_.get(dmCtrl, 'mObj.players'), {id: que.data.playerID}).name);
					_.set(que, 'data.side',
						_.find(_.get(dmCtrl, 'mObj.players'), {id: que.data.playerID}).side);
					console.log('MESG: ', que.action, que.data);
					_.get(dmCtrl, 'mObj.chatMsgs').push(que.data);
				}else if (que.action === 'baseInfo') { //send command responses
					//console.log('CMD: ', que.action, que.data);
					_.forEach(que.data, function (value, key) {
						if (typeof gmapService.circleOverlay[key] !== "undefined") {
							if(_.get(dmCtrl, ['mObj', 'bases', key]) !== value){
								console.log('base captured, updating overlay');
								gmapService.updateOverlay(key, value);
							}
						}else{
							gmapService.addOverlay(key, value);
						}
					});
					_.set(dmCtrl, 'mObj.bases', que.data);
				}else if (que.action === 'CMD') { //send command responses
					//console.log('CMD: ', que.action, que.data);
					_.get(dmCtrl, 'mObj.cmds').push(que.data);
				}else if (que.action === 'socketInfo') { //send client info
					//console.log('CLIENT: ', que.action, que.data);
					_.set(dmCtrl, 'mObj.client', que.data);
				} else {
					//console.log('EVENT', que.action, que.data);
					_.get(dmCtrl, 'mObj.events').push(que.data);
					_.get(dmCtrl, 'mObj.eventMsgs').push({message: JSON.stringify(que.data)});
				}
				_.set(dmCtrl, 'mObj.client.player',
					_.find(_.get(dmCtrl, 'mObj.players'),
						{socketID: _.get(dmCtrl, 'mObj.client.id', '')}));
			});
		});
		socket.on('error', function () {
			//console.log(ev, data);
		});

		_.set($scope, 'map', _.get(gmapService, 'gmapObj'));
	}
	dynMapController.$inject = ['$scope', '$stateParams', 'gmapService', 'mySocket'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('dynMap', {
				controller: 'dynMapController',
				controllerAs: 'dynC',
				templateUrl: '/apps/dynamic-dcs/states/dynMap/dynMap.tpl.html',
				url: '/DynamicMap?name'
			})
		;
	}

	angular
		.module('state.dynMap', [
			'ui.router',
			'dynamic-dcs.gmapService',
			'dynamic-dcs.socketFactory'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynMapController', dynMapController)
		.controller('templateController',function(){})
	;
}(angular));
