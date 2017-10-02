(function (angular) {
	'use strict';

	function getTheaters (theaterService) {
		return theaterService.getTheaters();
	}
	getTheaters.$inject=['theaterService'];

	function dynMapController($scope, $state, $stateParams, userAccountService, gmapService, DCSUserAccountsAPI, srvPlayerAPI, mySocket, srvService, theaters) {
		var dmCtrl = this;
		var pSide;
		var curTheater = _.get(_.find(_.get(srvService, 'servers'), {name: _.get($stateParams, 'name')}), 'theater');
		var theaterObj = _.find(theaters, {name: curTheater});
		var expireRetrySecs = 1000;
		var expireInitSecs = 5000;
		var curTime = new Date().getTime();
		_.set(dmCtrl, 'nextResyncTime', 0);

		_.set(dmCtrl, 'resetMap', function () {
			//init vars on connect
			_.set(dmCtrl, 'nextResyncTime', curTime + expireInitSecs, curTime);
			gmapService.init(theaterObj);
			_.set(dmCtrl, 'mObj', {
				client: {},
				units: [],
				bases: {},
				overlays: [],
				players: [],
				chatMsgs: [],
				cmds: [],
				events: [],
				eventMsgs: []
			});
			_.set($scope, 'map', _.get(gmapService, 'gmapObj'));
		});
		dmCtrl.resetMap();

		setTimeout(function(){
			var dread = DCSUserAccountsAPI.query();
			dread.$promise
				.then(function (data) {
					_.set(userAccountService, 'userAccounts', data);
					_.set(userAccountService, 'localAccount', _.find(data, {authId: localStorage.getItem('sub')}));
					if (typeof userAccountService.localAccount !== 'undefined' && userAccountService.localAccount.permLvl < 20) {
						console.log('joinroom: ', $stateParams.name, _.get(userAccountService, ['localAccount', 'authId']));
						mySocket.emit('room', {
							server: $stateParams.name,
							authId: localStorage.getItem('sub')
						});
						localStorage.setItem('lastStream', $stateParams.name);
					} else {
						var spread = srvPlayerAPI.query({name: $stateParams.name});
						spread.$promise
							.then(function (srvPlayers) {
								mySocket.emit('room', {
									server: $stateParams.name,
									authId: localStorage.getItem('sub')
								});
								localStorage.setItem('lastStream', $stateParams.name);
							})
						;
					}

				})
			;
		}, 1 * 1000);


		//socket.io connectors
		mySocket.on('srvUpd', function (data) {
			// only listen to packets I need
			if(_.get(data, 'name') === _.get($stateParams, 'name')){
				// console.log(data);
				_.forEach(data.que, function (que) {
					if (
						que.action === 'INIT' ||
						que.action === 'C' ||
						que.action === 'U' ||
						que.action === 'D'
					) {
						if (que.action === 'C' || que.action === 'INIT') {
							if (typeof _.find(_.get(dmCtrl, 'mObj.units'),
									{'unitID': _.get(que, 'data.unitID')}) !== "undefined") {
								_.find(_.get(dmCtrl, 'mObj.units'),
									{'unitID': _.get(que, 'data.unitID')}).action = 'U';
							}
						}
						if (que.action === 'U') {
							if (!_.find(_.get(dmCtrl, 'mObj.units'), {'unitID': _.get(que, 'data.unitID')})) {
								var cResync = _.get(dmCtrl, 'nextResyncTime', 0);
								console.log('nextResync: ', cResync, curTime);
								// data is out of sync, request full payload
								if ( cResync < curTime) {
									mySocket.emit('clientUpd', {
										name: $stateParams.name,
										action: 'unitINIT',
										authId: _.get(userAccountService, ['localAccount', 'authId'])
									});
									console.log('RESYNCING, nexttResyncTime:',cResync, ' - ', curTime, ' + ', expireRetrySecs);
									_.set(dmCtrl, 'nextResyncTime', curTime + expireRetrySecs);
								} else {
									console.log('unit resync sent waiting '+(cResync - curTime)+ ' more seconds.');
								}

								_.set(dmCtrl, 'lastResyncTime', new Date().getTime());
								return false; // stops the rest of the updates since where doing a resync
							} else {
								_.find(_.get(dmCtrl, 'mObj.units'),
									{'unitID': _.get(que, 'data.unitID')}).lat = _.get(que, 'data.lat');
								_.find(_.get(dmCtrl, 'mObj.units'),
									{'unitID': _.get(que, 'data.unitID')}).lon = _.get(que, 'data.lon');
								gmapService.processUnitStream(que);
							}
						} else {
							//send map updates
							dmCtrl.mObj.units.push(_.get(que, 'data'));
							gmapService.processUnitStream(que);
						}
					} else if (que.action === 'reset') { //spectator
						_.set(dmCtrl, 'mObj.units', []);
						gmapService.resetMarkers();
					} else if (que.action === 'players') { //player
						var curPObj = [];
						_.forEach(que.data, function (player) {
							if (typeof player !== "undefined") {
								curPObj.push(player);
							}
						});
						_.set(dmCtrl, 'mObj.players', curPObj);
					} else if (que.action === 'MESG') { //send mesg
						_.set(que, 'data.name',
							_.find(_.get(dmCtrl, 'mObj.players'), {id: que.data.playerID}).name);
						_.set(que, 'data.side',
							_.find(_.get(dmCtrl, 'mObj.players'), {id: que.data.playerID}).side);
						console.log('MESG: ', que.action, que.data);
						_.get(dmCtrl, 'mObj.chatMsgs').push(que.data);
					} else if (que.action === 'baseInfo') { //send command responses
						_.forEach(que.data, function (value, key) {
							if (typeof gmapService.circleOverlay[key] !== "undefined") {

								if (_.get(dmCtrl, ['mObj', 'bases', key]) !== value) {
									console.log('base captured, updating overlay');
									gmapService.updateOverlay(key, value);
								}
							} else {
								//console.log('add baseInfo: ',que.data, dmCtrl.mObj.bases);
								gmapService.addOverlay(key, value);
							}
						});
						_.set(dmCtrl, 'mObj.bases', que.data);
					} else if (que.action === 'CMD') { //send command responses
						//console.log('CMD: ', que.action, que.data);
						_.get(dmCtrl, 'mObj.cmds').push(que.data);
					} else if (que.action === 'socketInfo') { //send client info
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
			}
		});
		mySocket.on('error', function () {
			//console.log(ev, data);
		});

		mySocket.on('reconnect', function () {
			setTimeout(function(){
				dmCtrl.resetMap();
				mySocket.emit('room', {
					server: localStorage.getItem('lastStream'),
					authId: localStorage.getItem('sub')
				});
			}, 1 * 1000);
		});
	}

	dynMapController.$inject = ['$scope', '$state', '$stateParams', 'userAccountService', 'gmapService', 'dynamic-dcs.api.userAccounts', 'dynamic-dcs.api.srvPlayer', 'mySocket', 'srvService', 'theaters'];

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
			'dynamic-dcs.gmapService',
			'dynamic-dcs.api.srvPlayer',
			'dynamic-dcs.api.userAccounts'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('dynMapController', dynMapController)
		.controller('templateController', function () {
		})
	;
}(angular));
