(function (angular) {
	'use strict';

	function dynMsgService (gmapControls, socket) {
		var dmSrv = this;
		_.set(dmSrv, 'cObj', {
			client: {},
			units: [],
			players: [],
			msgs: [],
			cmds: [],
			events: []
		});

		socket.on('connect', function () {
			_.set(dmSrv, 'cObj.units', []);
			gmapControls.resetMarkers();
			socket.emit('clientUpd', { action: 'unitINIT' });
		});

		//socket.io connectors
		socket.on('srvUpd', function (data) {
			_.forEach(data.que, function(que) {
				if (que.action === 'INIT' || que.action === 'C' || que.action === 'U' || que.action === 'D') {
					if(que.action === 'C' || que.action === 'INIT') {
						if (typeof _.find(_.get(dmSrv, 'cObj.units'), { 'unitID': _.get(que, 'data.unitID') }) !== "undefined") {
							_.find(_.get(dmSrv, 'cObj.units'), { 'unitID': _.get(que, 'data.unitID') }).action = 'U';
						}
					}
					if(que.action === 'U') {
						if(!_.find(_.get(dmSrv, 'cObj.units'), {'unitID': _.get(que, 'data.unitID')})){
							_.set(dmSrv, 'cObj.units', []);
							gmapControls.resetMarkers();
							socket.emit('clientUpd', { action: 'unitINIT' });
						}else{
							_.find(_.get(dmSrv, 'cObj.units'), {'unitID': _.get(que, 'data.unitID')}).lat = _.get(que, 'data.lat');
							_.find(_.get(dmSrv, 'cObj.units'), {'unitID': _.get(que, 'data.unitID')}).lon = _.get(que, 'data.lon');
							gmapControls.processUnitStream(que);
						}
					}else{
						//send map updates
						dmSrv.cObj.units.push(_.get(que, 'data'));
						gmapControls.processUnitStream(que);
					}
				}else if (que.action === 'reset') { //spectator
					_.set(dmSrv, 'cObj.units', []);
					gmapControls.resetMarkers();
				}else if (que.action === 'players') { //player
					_.set(dmSrv, 'cObj.players', que.data);
				}else if (que.action === 'MESG') { //send mesg
					console.log('MESG: ', que.action, que.data);
					_.get(dmSrv, 'cObj.msgs').push(que.data);
				}else if (que.action === 'CMD') { //send command responses
					console.log('CMD: ', que.action, que.data);
					_.get(dmSrv, 'cObj.cmds').push(que.data);
				}else if (que.action === 'socketInfo') { //send client info
					console.log('CLIENT: ', que.action, que.data);
					_.set(dmSrv, 'cObj.client', que.data);
				} else {
					console.log('EVENT', que.action, que.data);
					_.get(dmSrv, 'cObj.events').push(que.data);
				}
				_.set(dmSrv, 'cObj.client.player', _.find(_.get(dmSrv, 'cObj.players'), {socketID: _.get(dmSrv, 'cObj.client.id')}));
			});
		});
		socket.on('error', function (data) {
			//console.log(ev, data);
		});


	}
	dynMsgService.$inject = ['gmapService', 'mySocket'];

	function initializedynMsgService (dynMsgService) {
		console.log('init msg service');
		//dynMsgService.init();
	}
	initializedynMsgService.$inject = [
		'dynMsgService'
	];

	angular
		.module('dynamic-dcs.dynMsgService',[
			'dynamic-dcs.socketFactory',
			'dynamic-dcs.gmapService'
		])
		.run(initializedynMsgService)
		.service('dynMsgService', dynMsgService)
	;
}(angular));
