//Controllers
const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');

exports.isNumeric = function (x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

exports.initClear= function (serverName, serverType) {
	if (serverType === 'client') {
		_.set(curServers, [serverName, 'serverObject', 'units'], []);
		//Unit.collection.drop();
		dbMapServiceController.unitActions('dropall', serverName); //someday maps will persist, reset all units
		_.set(curServers, [serverName, 'serverObject', 'ClientRequestArray'], []);
	}
	if (serverType === 'server') {
		_.set(curServers, [serverName, 'serverObject', 'GameGUIRequestArray'], []);
	}
}

exports.initUnits = function (serverName, socketID, authId, io) {
	console.log('sendInitUNITS for ', serverName, ' for socket ', socketID);
	var curIP = io.sockets.connected[socketID].conn.remoteAddress.replace("::ffff:", "");
	var initQue = {que: []};
	if (curIP === ':10308' || curIP ==='127.0.0.1') {
		curIP = '192.168.44.148';
	}

	dbSystemServiceController.userAccountActions('read')
		.then(function (userAccounts) {
			var curAccount;
			if (authId) {
				curAccount = _.find(userAccounts, {authId: authId});
			} else {
				curAccount = _.find(userAccounts, function (user) { //{ipaddr: curIP}
					if (_.includes(user.lastIp, curIP)) {
						return true;
					}
				});
				dbMapServiceController.srvPlayerActions('read', serverName)
					.then(function (srvPlayers) {
						var pSide;
						if (typeof curAccount !== 'undefined') {
							var curSrvPlayer = _.find(srvPlayers, {ucid: curAccount.ucid});

							if (curAccount.permLvl < 20) {
								pSide = 'admin';
							} else {
								pSide = _.get(curSrvPlayer, 'side', 0);
							}
						} else {
							pSide = _.find(srvPlayers, function (player) {
								if (_.includes(player.ipaddr, curIP)) {
									return true;
								}
								return false
							}).side;

							if (_.get(curServers, [serverName, 'serverObject', 'units'], []).length > 0 && pSide !== 0) {
								_.forEach(_.get(curServers, [serverName, 'serverObject', 'units'], []), function (unit) {
									if (_.get(unit, 'coalition') === pSide || pSide === 'admin') {
										var curObj = {
											action: 'INIT',
											data: {
												unitID: parseFloat(_.get(unit, 'unitID')),
												type: _.get(unit, 'type'),
												coalition: parseFloat(_.get(unit, 'coalition')),
												lat: parseFloat(_.get(unit, 'lat')),
												lon: parseFloat(_.get(unit, 'lon')),
												alt: parseFloat(_.get(unit, 'alt')),
												hdg: parseFloat(_.get(unit, 'hdg')),
												speed: parseFloat(_.get(unit, 'speed')),
												playername: _.get(unit, 'playername', '')
											}
										};
										initQue.que.push(_.cloneDeep(curObj));
									}
								});
							}

							var sendAmt = 0;
							var totalChkLoops = _.ceil(initQue.que.length / config.perSendMax);

							var chkPayload = {que: [{action: 'reset'}]};
							for (x = 0; x < totalChkLoops; x++) {
								if (initQue.que.length < config.perSendMax) {
									sendAmt = initQue.que.length;
								} else {
									sendAmt = config.perSendMax
								}
								for (y = 0; y < sendAmt; y++) {
									chkPayload.que.push(initQue.que[0]);
									initQue.que.shift();
								}
								//console.log('que: ',chkPayload);
								io.to(socketID).emit('srvUpd', chkPayload);
								chkPayload = {que: []};
							}
						}
					})
				;
			}
		})
	;
}

//initArray Push
exports.sendInit = function (serverName, socketID, authId) {

	if (socketID === 'all') {
		//problem, find out what sockets are on what server.....
		_.forEach(io.sockets.sockets, function (socket) {
			console.log('send init to all clients', socket.id);
			initUnits(serverName, socket.id, authId);
		});
	} else {
		initUnits(serverName, socketID, authId);
	}
}
