(function (angular) {
	'use strict';

	function dynMsgService (gmapService, socket) {
		var dmSrv = this;
		_.set(dmSrv, 'cObj', {
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

		socket.on('connect', function () {
			if (dmSrv.cObj.units.length > 0){
				_.set(dmSrv, 'cObj.units', []);
				gmapService.resetMarkers();
			}
			socket.emit('clientUpd', { action: 'unitINIT' });
		});

		//socket.io connectors
		socket.on('srvUpd', function (data) {
			console.log(data);
			_.forEach(data.que, function(que) {
				if (que.action === 'INIT' || que.action === 'C' ||
					que.action === 'U' || que.action === 'D') {
					if(que.action === 'C' || que.action === 'INIT') {
						if (typeof _.find(_.get(dmSrv, 'cObj.units'),
								{ 'unitID': _.get(que, 'data.unitID') }) !== "undefined") {
							_.find(_.get(dmSrv, 'cObj.units'),
								{ 'unitID': _.get(que, 'data.unitID') }).action = 'U';
						}
					}
					if(que.action === 'U') {
						if(!_.find(_.get(dmSrv, 'cObj.units'),
								{'unitID': _.get(que, 'data.unitID')})){
							_.set(dmSrv, 'cObj.units', []);
							gmapService.resetMarkers();
							socket.emit('clientUpd', { action: 'unitINIT' });
						}else{
							_.find(_.get(dmSrv, 'cObj.units'),
								{'unitID': _.get(que, 'data.unitID')}).lat = _.get(que, 'data.lat');
							_.find(_.get(dmSrv, 'cObj.units'),
								{'unitID': _.get(que, 'data.unitID')}).lon = _.get(que, 'data.lon');
							gmapService.processUnitStream(que);
						}
					}else{
						//send map updates
						dmSrv.cObj.units.push(_.get(que, 'data'));
						gmapService.processUnitStream(que);
					}
				}else if (que.action === 'reset') { //spectator
					_.set(dmSrv, 'cObj.units', []);
					gmapService.resetMarkers();
				}else if (que.action === 'players') { //player
					var curPObj = [];
					_.forEach(que.data, function (player) {
						if ( typeof player !== "undefined"){
							curPObj.push(player);
						}
					});
					_.set(dmSrv, 'cObj.players', curPObj);
				}else if (que.action === 'MESG') { //send mesg
					_.set(que, 'data.name',
						_.find(_.get(dmSrv, 'cObj.players'), {id: que.data.playerID}).name);
					_.set(que, 'data.side',
						_.find(_.get(dmSrv, 'cObj.players'), {id: que.data.playerID}).side);
					console.log('MESG: ', que.action, que.data);
					_.get(dmSrv, 'cObj.chatMsgs').push(que.data);
				}else if (que.action === 'baseInfo') { //send command responses
					//console.log('CMD: ', que.action, que.data);
					_.forEach(que.data, function (value, key) {
						if (typeof gmapService.circleOverlay[key] !== "undefined") {
							if(_.get(dmSrv, ['cObj', 'bases', key]) !== value){
								console.log('base captured, updating overlay');
								gmapService.updateOverlay(key, value);
							}
						}else{
							gmapService.addOverlay(key, value);
						}
					});
					_.set(dmSrv, 'cObj.bases', que.data);
				}else if (que.action === 'CMD') { //send command responses
					//console.log('CMD: ', que.action, que.data);
					_.get(dmSrv, 'cObj.cmds').push(que.data);
				}else if (que.action === 'socketInfo') { //send client info
					//console.log('CLIENT: ', que.action, que.data);
					_.set(dmSrv, 'cObj.client', que.data);
				} else {
					//console.log('EVENT', que.action, que.data);
					_.get(dmSrv, 'cObj.events').push(que.data);
					_.get(dmSrv, 'cObj.eventMsgs').push({message: JSON.stringify(que.data)});
				}
				_.set(dmSrv, 'cObj.client.player',
					_.find(_.get(dmSrv, 'cObj.players'),
						{socketID: _.get(dmSrv, 'cObj.client.id', '')}));
			});
		});
		socket.on('error', function () {
			//console.log(ev, data);
		});


	}
	dynMsgService.$inject = ['gmapService', 'mySocket'];
/*
	function initializedynMsgService (dynMsgService) {
		console.log('init msg service');
		//dynMsgService.init();
	}
	initializedynMsgService.$inject = [
		'dynMsgService'
	];
*/
	angular
		.module('dynamic-dcs.dynMsgService',[
			'dynamic-dcs.socketFactory',
			'dynamic-dcs.gmapService'
		])
		// .run(initializedynMsgService)
		.service('dynMsgService', dynMsgService)
	;
}(angular));
