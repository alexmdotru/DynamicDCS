const express = require('express'),
	app = express(),
	jwt = require('express-jwt'),
	jwtAuthz = require('express-jwt-authz'),
	jwksRsa = require('jwks-rsa'),
	socketioJwt = require('socketio-jwt'),
	cors = require('cors'),
	bodyParser = require('body-parser'),
	router = express.Router(),
	protectedRouter = express.Router(),
	path = require('path'),
	assert = require('assert'),
	_ = require('lodash'),
	config = require('./config/main');
require('dotenv').config();

if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
	throw 'Make sure you have AUTH0_DOMAIN, and AUTH0_AUDIENCE in your .env file'
}

//main server ip
server = app.listen(config.port);

//secure sockets
var io = require('socket.io').listen(server);

//Controllers
const dbSystemServiceController = require('./controllers/dbSystemService');
const dbMapServiceController = require('./controllers/dbMapService');
const DCSSocket = require('./controllers/DCSSocket');
const DCSLuaCommands = require('./controllers/DCSLuaCommands');

var admin = false;

// app.use/routes/etc...
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.disable('x-powered-by');

app.use('/api', router);
app.use('/api/protected', protectedRouter);
app.use('/', express.static(__dirname + '/dist'));
app.use('/json', express.static(__dirname + '/app/assets/json'));
app.use('/css', express.static(__dirname + '/app/assets/css'));
app.use('/fonts', express.static(__dirname + '/app/assets/fonts'));
app.use('/imgs', express.static(__dirname + '/app/assets/images'));
app.use('/tabs', express.static(__dirname + '/app/tabs'));
app.use('/libs', express.static(__dirname + '/node_modules'));


const checkJwt = jwt({
	// Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: 'https://' + process.env.AUTH0_DOMAIN + '/.well-known/jwks.json'
	}),
	// Validate the audience and the issuer.
	audience: process.env.AUTH0_AUDIENCE,
	issuer: 'https://' + process.env.AUTH0_DOMAIN + '/',
	algorithms: ['RS256']
});
//io.use(function (socket, next) {
//	// hack the token checker!! :-P
//	var req = {};
//	var res;
//	_.set(req, 'headers.authorization', socket.handshake.query.token);
//	checkJwt(req, res, next);
//});


router.route('/srvPlayers/:name')
	.get(function (req, res) {
		dbMapServiceController.srvPlayerActions('read', req.params.name)
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/theaters')
	.get(function (req, res) {
		dbSystemServiceController.theaterActions('read')
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/servers')
	.get(function (req, res) {
		dbSystemServiceController.serverActions('read')
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/servers/:server_name')
	.get(function (req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		dbSystemServiceController.serverActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/userAccounts')
	.get(function (req, res) {
		dbSystemServiceController.userAccountActions('read')
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/userAccounts/:_id')
	.get(function (req, res) {
		_.set(req, 'body.ucid', req.params._id);
		dbSystemServiceController.userAccountActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	});
router.route('/checkUserAccount')
	.post(function (req, res) {
		dbSystemServiceController.userAccountActions('checkAccount', req)
			.then(function (resp) {
				res.json(resp);
			});
	});

//start of protected endpoints, must have auth token
protectedRouter.use(checkJwt);
//past this point must have permission value less than 10
protectedRouter.use(function (req, res, next) {
	dbSystemServiceController.userAccountActions('getPerm', req.user.sub)
		.then(function (resp) {
			if (resp[0].permLvl < 10) {
				next();
			} else {
				res.status('503').json({message: "You dont have permissions to do requested action."});
			}
		})
	;
});

protectedRouter.route('/servers')
	.post(function (req, res) {
		dbSystemServiceController.serverActions('create', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	});
protectedRouter.route('/servers/:server_name')
	.put(function (req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		dbSystemServiceController.serverActions('update', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	})
	.delete(function (req, res) {
		_.set(req, 'body.name', req.params.server_name);
		dbSystemServiceController.serverActions('delete', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	});

protectedRouter.route('/userAccounts')
	.post(function (req, res) {
		dbSystemServiceController.userAccountActions('create', req.body)
			.then(function (resp) {
				res.json(resp);
			});
	});
/*
 protectedRouter.route('/userAccounts/:_id')
 .put(function(req, res) {
 _.set(req, 'body._id', req.params._id);
 dbSystemServiceController.userAccountActions('update', req.body)
 .then(function (resp){
 res.json(resp);
 });
 });
 */
//setup globals
var outOfSyncUnitCnt = 0;
var socketQues = ['q0', 'q1', 'q2', 'qadmin'];
var curServers = {};
var nonaccountUsers = {};
var shootingUsers = {};

function initClear(serverName, serverType) {
	if (serverType === 'client') {
		_.set(curServers, [serverName, 'serverObject', 'units'], []);
		//Unit.collection.drop();
		dbMapServiceController.unitActions('dropall', serverName); //someday maps will persist, reset all units
	}
}

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

function initUnits(serverName, socketID, authId) {
	var curIP = io.sockets.connected[socketID].conn.remoteAddress.replace("::ffff:", "");
	var initQue = {que: []};
	if (curIP === ':10308') {
		curIP = '127.0.0.1';
	}

	dbSystemServiceController.userAccountActions('read')
		.then(function (userAccounts) {
			var curAccount;
			if (authId) {
				curAccount = _.find(userAccounts, {authId: authId});
			}
			dbMapServiceController.srvPlayerActions('read', serverName)
				.then(function (srvPlayers) {
					var pSide;
					var curSrvPlayer;
					var curActUpdate;
					if (curAccount) {
						if (curAccount.ucid) {
							curSrvPlayer = _.find(srvPlayers, {ucid: curAccount.ucid});
						} else {
							curSrvPlayer = _.find(srvPlayers, function (player) {
								if (_.includes(player.ipaddr, curIP)) {
									return true;
								}
								return false
							});
							curActUpdate = {
								ucid: _.get(curSrvPlayer, 'ucid', ''),
								gameName: _.get(curSrvPlayer, 'name', ''),
								lastIp: _.get(curSrvPlayer, 'ipaddr', '')
							};
							dbSystemServiceController.userAccountActions('update', curActUpdate)
								.then(function (data) {

								})
								.catch(function (err) {
									console.log('line249', err);
								})
							;
						}
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
					}
					if (_.get(curServers, [serverName, 'serverObject', 'units'], []).length > 0 && pSide !== 0) {
						_.forEach(_.get(curServers, [serverName, 'serverObject', 'units'], []), function (unit) {
							if (_.get(unit, 'coalition') === pSide || pSide === 'admin') {
								curObj = {
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
						_.set(chkPayload, 'name', serverName);
						io.to(socketID).emit('srvUpd', chkPayload);
						chkPayload = {que: []};
					}
				})
				.catch(function (err) {
					console.log('line307', err);
				});
			;
		})
		.catch(function (err) {
			console.log('line309', err);
		});
	;
}

//initArray Push
function sendInit(serverName, socketID, authId) {

	if (socketID === 'all') {
		//problem, find out what sockets are on what server.....
		_.forEach(io.sockets.sockets, function (socket) {
			initUnits(serverName, socket.id, authId);
		});
	} else {
		initUnits(serverName, socketID, authId);
	}
}


function setSocketRoom(socket, room) {
	if (socket.room) {
		socket.leave(socket.room);
	}
	socket.room = room;
	socket.join(room);
}

function setRoomSide(socket, roomObj) {
	var srvPlayer;
	var pSide;
	var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
	if (curIP === ':10308') {
		curIP = '127.0.0.1';
	}

	if (roomObj.server === 'leaderboard') {
		setSocketRoom(socket, 'leaderboard');
	} else {
		dbSystemServiceController.userAccountActions('read')
			.then(function (userAccounts) {
				var curAccount = _.find(userAccounts, {authId: roomObj.authId}); // might have to decrypt authtoken...
				if (curAccount) {
					dbMapServiceController.srvPlayerActions('read', roomObj.server)
						.then(function (srvPlayers) {
							if(curAccount.ucid) {
								srvPlayer = _.find(srvPlayers, {ucid: curAccount.ucid});
								if(srvPlayer.side) {
									pSide = srvPlayer.side;
								} else {
									console.log('srvPlayer doesnt have a side line370');
								}
							} else {
								srvPlayer = _.find(srvPlayers, function (player) { //{ipaddr: curIP}
									if (_.includes(player.ipaddr, curIP)) {
										return true;
									}
									return false;
								});
								if(srvPlayer.side) {
									pSide = srvPlayer.side;
								} else {
									console.log('srvPlayer doesnt have a side line 383');
								}
							}
							if (curAccount.permLvl < 20) {
								setSocketRoom(socket, roomObj.server + '_qadmin');
							} else if (pSide === 1 || pSide === 2) {
								setSocketRoom(socket, roomObj.server + '_q' + pSide);
							}
						})
						.catch(function (err) {
							console.log('line392', err);
						});
					;
				} else {
					dbMapServiceController.srvPlayerActions('read', roomObj.server)
						.then(function (srvPlayers) {
							var curPlayer = _.find(srvPlayers, function (player) { //{ipaddr: curIP}
								if (_.includes(player.ipaddr, curIP)) {
									console.log('player l392: ', player);
									return true;
								}
								return false;
							});
							if( curPlayer ) {
								setSocketRoom(socket, roomObj.server + '_q' + curPlayer.side);
								nonaccountUsers[curPlayer.ucid] = {
									curSocket: socket.id
								};
							} else {
								setSocketRoom(socket, roomObj.server + '_q0' );
							}
						})
						.catch(function (err) {
							console.log('error no account detected, line404');
						});
					;
				}
			})
			.catch(function (err) {
				console.log('line418', err);
			});
		;
	}
}

//setup socket io
io.on('connection', function (socket) {
	var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
	if (curIP === ':10308') {
		curIP = '127.0.0.1';
	}

	console.log(socket.id + ' connected on ' + curIP + ' with ID: ' + socket.handshake.query.authId);
	if (socket.handshake.query.authId === 'null') {
		console.log('NOT LOGGED IN', socket.handshake.query.authId);
		socket.on('room', function (roomObj) {
			setRoomSide(socket, roomObj);
		});

		socket.on('clientUpd', function (data) {
			if (data.action === 'unitINIT') {
				if (curServers[data.name]) {
					sendInit(data.name, socket.id, data.authId);
				}
			}
		});

		socket.on('disconnect', function () {
			console.log(socket.id + ' user disconnected');
		});
		socket.on('error', function (err) {
			if (err === 'handshake error') {
				console.log('handshake error', err);
			} else {
				console.log('io error', err);
			}
		});
	} else {
		console.log('LOGGED IN', socket.handshake.query.authId);
		dbSystemServiceController.userAccountActions('updateSocket', {
			authId: socket.handshake.query.authId,
			curSocket: socket.id,
			lastIp: curIP
		})
			.then(function (data) {
				socket.on('room', function (roomObj) {
					setRoomSide(socket, roomObj);
				});

				socket.on('clientUpd', function (data) {
					if (data.action === 'unitINIT') {
						if (curServers[data.name]) {
							sendInit(data.name, socket.id, data.authId);
						}
					}
				});

				socket.on('disconnect', function () {
					console.log(socket.id + ' user disconnected');
				});
				socket.on('error', function (err) {
					if (err === 'handshake error') {
						console.log('handshake error', err);
					} else {
						console.log('io error', err);
					}
				});
			})
			.catch(function (err) {
				console.log('line495', err);
			});
		;
	}
});

_.set(curServers, 'processQue', function (serverName, sessionName, update) {
	if (update.unitCount) {
		if (update.unitCount !== curServers[serverName].serverObject.units.length) {
			console.log('out of sync for ' + serverName + ' units: '+ update.unitCount + ' verse ' + curServers[serverName].serverObject.units.length);
			if (outOfSyncUnitCnt > config.outOfSyncUnitThreshold) {
				outOfSyncUnitCnt = 0;
				console.log('reset server units');
				initClear(serverName, 'client');
				dbMapServiceController.cmdQueActions('save', serverName, {queName: 'clientArray', actionObj: {action: "INIT"}});
				//_.get(curServers, [serverName, 'serverObject', 'ClientRequestArray']).push({"action": "INIT"});
				sendInit(serverName, 'all');
			} else {
				outOfSyncUnitCnt++;
			}
		} else {
			outOfSyncUnitCnt = 0;
		}
	}

	_.forEach(update.que, function (queObj) {
		var curObj = {};
		var iPlayer = {};
		var tPlayer = {};
		var iUnit = {};
		var tUnit = {};
		var curUnit = _.find(curServers[serverName].serverObject.units, {'unitID': _.get(queObj, 'data.unitID')});

		if (_.get(queObj, 'action') === 'C') {
			if (curUnit) {
				curUnit.action = 'U';
			} else {
				curObj = {
					action: 'C',
					sessionName: sessionName,
					data: {
						_id: parseFloat(_.get(queObj, 'data.unitID')),
						unitID: parseFloat(_.get(queObj, 'data.unitID')),
						type: _.get(queObj, 'data.type'),
						coalition: parseFloat(_.get(queObj, 'data.coalition')),
						lat: parseFloat(_.get(queObj, 'data.lat')),
						lon: parseFloat(_.get(queObj, 'data.lon')),
						alt: parseFloat(_.get(queObj, 'data.alt')),
						hdg: parseFloat(_.get(queObj, 'data.hdg')),
						speed: parseFloat(_.get(queObj, 'data.speed')),
						playername: _.get(queObj, 'data.playername', '')
					}
				};

				dbMapServiceController.unitActions('save', serverName, curObj.data);

				curServers[serverName].serverObject.units.push(_.cloneDeep(curObj.data));
				curServers[serverName].updateQue['q' + parseFloat(_.get(queObj, 'data.coalition'))].push(_.cloneDeep(curObj));
				curServers[serverName].updateQue.qadmin.push(_.cloneDeep(curObj));
			}
		}
		if (_.get(queObj, 'action') === 'U') {
			if (curUnit) {
				curUnit.lat = parseFloat(_.get(queObj, 'data.lat'));
				curUnit.lon = parseFloat(_.get(queObj, 'data.lon'));
				curUnit.alt = parseFloat(_.get(queObj, 'data.alt'));
				curUnit.hdg = parseFloat(_.get(queObj, 'data.hdg'));
				curUnit.speed = parseFloat(_.get(queObj, 'data.speed'));
				curObj = {
					action: 'U',
					sessionName: sessionName,
					data: {
						_id: parseFloat(_.get(queObj, 'data.unitID')),
						unitID: _.get(queObj, 'data.unitID'),
						lat: parseFloat(_.get(queObj, 'data.lat')),
						lon: parseFloat(_.get(queObj, 'data.lon')),
						alt: parseFloat(_.get(queObj, 'data.alt')),
						hdg: parseFloat(_.get(queObj, 'data.hdg')),
						speed: parseFloat(_.get(queObj, 'data.speed'))
					}
				};
				dbMapServiceController.unitActions('update', serverName, curObj.data);

				curServers[serverName].updateQue['q' + curUnit.coalition].push(_.cloneDeep(curObj));
				curServers[serverName].updateQue.qadmin.push(_.cloneDeep(curObj));
			}
		}
		if (_.get(queObj, 'action') === 'D') {
			curObj = {
				action: 'D',
				sessionName: sessionName,
				data: {
					_id: parseFloat(_.get(queObj, 'data.unitID')),
					unitID: _.get(queObj, 'data.unitID')
				}
			};

			dbMapServiceController.unitActions('delete', serverName, curObj.data);
			_.remove(curServers[serverName].serverObject.units, {'unitID': _.get(queObj, 'data.unitID')});
			curServers[serverName].updateQue['q1'].push(_.cloneDeep(curObj));
			curServers[serverName].updateQue['q2'].push(_.cloneDeep(curObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(curObj));
		}

		//playerUpdate

		if (_.get(queObj, 'action') === 'players') {
			_.set(queObj, 'sessionName', sessionName);
			var switchedPlayer;
			_.forEach(queObj.data, function (player) {
				if (player !== null) {
					var matchPlayer = _.find(curServers[serverName].serverObject.players, {ucid: player.ucid});
					if(matchPlayer) {
						if ((matchPlayer.side !== player.side) && player.side !== 0) {
							if (_.get(matchPlayer, 'side')) {
								DCSLuaCommands.sendMesgToAll(
									serverName,
									'A: '+getSide(_.get(matchPlayer, 'side'))+' '+_.get(player, 'name')+' has commited Treason and switched to '+getSide(_.get(player, 'side'))+'. Shoot on sight! -1000pts',
									15
								);
							}
							dbSystemServiceController.userAccountActions('read')
								.then(function (resp) {
									switchedPlayer = nonaccountUsers[player.ucid];
									if(switchedPlayer) {
										switchedPlayer = _.find(resp, {ucid: player.ucid});

										if (switchedPlayer.permLvl < 20) {
											setSocketRoom(io.sockets.connected[switchedPlayer.curSocket], serverName + '_padmin');
										} else if (player.side && (player.side === 1 || player.side === 2)) {
											setSocketRoom(io.sockets.connected[switchedPlayer.curSocket], serverName + '_q' + player.side);
										}
									}
								})
								.catch(function (err) {
									console.log('line626', err);
								});
							;
						}
					} else {
						console.log('match player by ip');
					}
				}

			});
			//
			curServers[serverName].serverObject.players = queObj.data;
			//apply local information object

			_.forEach(queObj.data, function (data) {
				if (data) {
					if (data.ucid) {
						var curSide = data.side;
						_.set(data, '_id', data.ucid);
						_.set(data, 'playerId', data.id);
						//update map based player table
						dbMapServiceController.srvPlayerActions('update', serverName, data);
						if (data.ipaddr === ':10308') {
							data.ipaddr = '127.0.0.1';
						}
						var curActUpdate = {
							ucid: _.get(data, 'ucid', ''),
							gameName: _.get(data, 'name', ''),
							lastIp: _.get(data, 'ipaddr', ''),
							side: _.get(data, 'side', '')
						};
					}
				}
			});


			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}

		//Base Info
		if (_.get(queObj, 'action') === 'baseInfo') {
			_.set(queObj, 'sessionName', sessionName);
			_.forEach(queObj.data, function (value, key) {
				curObj = {
					_id: key,
					name: key,
					coalition: value
				};
				dbMapServiceController.baseActions('update', serverName, curObj);
			});

			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}

		//Cmd Response
		if (_.get(queObj, 'action') === 'CMDRESPONSE') {
			_.set(queObj, 'sessionName', sessionName);
			//send response straight to client id
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}

		//mesg
		if (_.get(queObj, 'action') === 'MESG') {
			_.set(queObj, 'sessionName', sessionName);
			// console.log('mesg: ', queObj);
			if (_.get(queObj, 'data.playerID')) {
				if (_.isNumber(_.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0))) {
					curServers[serverName].updateQue['q' + _.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0)]
						.push(_.cloneDeep(queObj));
					curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
				}
			}
		}

		_.set(queObj, 'data.sessionName', sessionName);

		function getSide (side) {
			if(side === 0){
				return 'Neutral';
			}
			if(side === 1){
				return 'Red';
			}
			if(side === 2){
				return 'Blue';
			}
		}

		// server side events
		if (_.get(queObj, 'action') === 'friendly_fire') {
			// "friendly_fire", playerID, weaponName, victimPlayerID
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(curObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'weaponName', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'tPlayerId', _.get(queObj, 'data.arg3'));
			tPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg3});
			if (tPlayer) {
				_.set(curObj, 'tPlayerUcid', _.get(tPlayer, 'ucid', queObj.data.arg3));
			}
			// console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has accidentally killed '+_.get(tPlayer, 'name')+' with a '+_.get(curObj, 'weaponName')+' - 100pts',
				15
			);
		}

		/*
		if (_.get(queObj, 'action') === 'mission_end') {
			// "mission_end", winner, msg
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'winner', _.get(queObj, 'data.arg1'));
			_.set(curObj, 'msg', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'kill') {
			// "kill", killerPlayerID, killerUnitType, killerSide, victimPlayerID, victimUnitType, victimSide, weaponName
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(curObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'iPlayerUnitType', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerSide', _.get(queObj, 'data.arg3'));
			_.set(curObj, 'tPlayerId', _.get(queObj, 'data.arg4'));
			tPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg4});
			if (tPlayer) {
				_.set(curObj, 'tPlayerUcid', _.get(tPlayer, 'ucid', queObj.data.arg4));
			}
			_.set(curObj, 'tPlayerUnitType', _.get(queObj, 'data.arg5'));
			_.set(curObj, 'tPlayerSide', _.get(queObj, 'data.arg6'));
			_.set(curObj, 'weaponName', _.get(queObj, 'data.arg7'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		*/

		if (_.get(queObj, 'action') === 'self_kill') {
			// "self_kill", playerID
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(curObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			// console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has killed himself',
				15
			);
		}

		if (_.get(queObj, 'action') === 'change_slot') {
			// "change_slot", playerID, slotID, prevSide
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(curObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg2'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg2});
			if (iUnit) {
				_.set(curObj, 'iPlayerSlotType', _.get(iUnit, 'type', queObj.data.arg2));
			}
			_.set(curObj, 'prevSide', _.get(queObj, 'data.arg3'));
			// console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'connect') {
			// "connect", playerID, name
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'iPlayerName', _.get(queObj, 'data.arg2'));
			// console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+_.get(curObj, 'iPlayerName')+' has connected',
				5
			);
		}
		if (_.get(queObj, 'action') === 'disconnect') {
			// "disconnect", playerID, name, playerSide, reason_code
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'iPlayerName', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerSide', _.get(queObj, 'data.arg3'));
			_.set(curObj, 'reasonCode', _.get(queObj, 'data.arg4'));
			// console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+_.get(iPlayer, 'name')+' has disconnected - Ping:'+_.get(iPlayer, 'ping')+' Lang:'+_.get(iPlayer, 'lang'),
				5
			);
		}
		/*
		if (_.get(queObj, 'action') === 'crash') {
			// "crash", playerID, unit_missionID
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'unitMissionId', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'eject') {
			// "eject", playerID, unit_missionID
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'unitMissionId', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'takeoff') {
			// "takeoff", playerID, unit_missionID, airdromeName
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'unitMissionId', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'airdromeName', _.get(queObj, 'data.arg3'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'landing') {
			// "landing", playerID, unit_missionID, airdromeName
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'unitMissionId', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'airdromeName', _.get(queObj, 'data.arg3'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'pilot_death') {
			// "pilot_death", playerID, unit_missionID
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(queObj, 'iPlayerUcid', _.get(iPlayer, 'ucid', queObj.data.arg1));
			}
			_.set(curObj, 'unitMissionId', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		*/
		// Client Side Events
		// name = eventType
		// arg1 = eventTypeID
		// arg2 = time
		// arg3 = initiator unit id
		// arg4 = target unit id
		// arg5 = place name
		// arg6 = subplace
		// arg7 = weapon used
		if (_.get(queObj, 'action') === 'S_EVENT_SHOT') {
			// Occurs whenever any unit in a mission fires a weapon.
			// But not any machine gun or autocannon based weapon,
			// those are handled by shooting_start.
			// arg1 = id
			// arg2 = time
			// arg3 = initiatorId
			// arg7 = weapon
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'eventId', _.get(queObj, 'data.arg1'));
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			_.set(queObj, ['data', 'arg7', 'unitType'], _.get(iUnit, 'type', ''));
			dbSystemServiceController.weaponScoreActions('read', _.get(queObj, 'data.arg7'))
				.then(function (weaponResp) {
					_.set(curObj, 'weaponName', _.get(weaponResp, 'name'));
					// _.set(curObj, 'score', _.get(weaponResp, 'score')); // no score for weapon just shot
					// console.log('Tevent: ', curObj);
					dbMapServiceController.statSrvEventActions('save', serverName, curObj);
				})
				.catch(function (err) {
					// console.log('Eevent: ', curObj);
					dbMapServiceController.statSrvEventActions('save', serverName, curObj);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_HIT') {
			// console.log('eventhit');
			// Occurs whenever an object is hit by a weapon.
			// arg1 = id
			// arg2 = time
			// arg3 = initiatorId
			// arg4 = targetId
			// arg7 = WeaponId
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'eventId', _.get(queObj, 'data.arg1'));
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			_.set(curObj, 'tPlayerUnitId', _.get(queObj, 'data.arg4'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
				_.set(queObj, ['data', 'arg7', 'unitType'], _.get(iUnit, 'type', ''));
			}
			console.log('read weapon type: ', _.get(queObj, 'data.arg7'));
			dbSystemServiceController.weaponScoreActions('read', _.get(queObj, 'data.arg7'))
				.then(function (weaponResp) {
					_.set(curObj, 'weaponName', _.get(weaponResp, 'name'));
					_.set(curObj, 'weaponDisplayName', _.get(weaponResp, 'displayName'));
					_.set(curObj, 'score', _.get(weaponResp, 'score'));
					tUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg4});
					if (tUnit) {
						_.set(curObj, 'tPlayerUnitType', _.get(tUnit, 'type', ''));
						_.set(curObj, 'tPlayerSide', _.get(tUnit, 'coalition', 0));
						_.set(curObj, 'tPlayerName', _.get(tUnit, 'playername', ''));
						if (tUnit.playername !== '') {
							tPlayer = _.find(curServers[serverName].serverObject.players, {name: tUnit.playername});
							if (tPlayer) {
								_.set(curObj, 'tPlayerUcid', tPlayer.ucid);
							}
						}
					}
					// console.log('Tevent: ', curObj);
					dbMapServiceController.statSrvEventActions('save', serverName, curObj);

					// obj cmd for sending mesg to clients
					var iPlayer;
					if (_.get(curObj, 'iPlayerName')){
						iPlayer = _.get(curObj, 'iPlayerName')+' in '+_.get(curObj, 'iPlayerUnitType');
					} else {
						iPlayer = _.get(curObj, 'iPlayerUnitType', '""');
					}
					var tPlayer;
					if (_.get(curObj, 'tPlayerName')){
						tPlayer = _.get(curObj, 'tPlayerName')+' in '+_.get(curObj, 'tPlayerUnitType');
					} else {
						tPlayer = _.get(curObj, 'tPlayerUnitType', '""');
					}

					console.log(serverName, 'HITHIT', getSide(_.get(curObj, 'iPlayerSide')), iPlayer, getSide(_.get(curObj, 'tPlayerSide')), tPlayer, _.get(shootingUsers, [iPlayer.ucid, 'count'], 0), _.set(curObj, 'weaponDisplayName'), _.get(curObj, 'score'));
					if (_.startsWith(_.get(curObj, 'weaponName'), 'weapons.shells')){
						console.log('shooting shells');
						_.set(shootingUsers, [iPlayer.ucid, 'count'], _.get(shootingUsers, [iPlayer.ucid, 'count'], 0)+1);
						//display msg once every 5 secs
						if(_.get(shootingUsers, [iPlayer.ucid, 'startTime']) + 5000 > new Date().getTime()){
							DCSLuaCommands.sendMesgToAll(
								serverName,
								'A: '+ getSide(_.get(curObj, 'iPlayerSide'))+' '+ iPlayer +' has hit '+getSide(_.get(curObj, 'tPlayerSide'))+' ' + tPlayer + ' '+_.get(shootingUsers, [iPlayer.ucid, 'count'], 0)+' times with ' + _.set(curObj, 'weaponDisplayName') + ' - +'+_.get(curObj, 'score'),
								20
							);
							_.set(shootingUsers, [iPlayer.ucid, 'count'], 0);
						};
					} else {
						console.log('other weapons');
						DCSLuaCommands.sendMesgToAll(
							serverName,
							'A: '+ getSide(_.get(curObj, 'iPlayerSide'))+' '+ iPlayer +' has hit '+getSide(_.get(curObj, 'tPlayerSide'))+' '+tPlayer + ' with ' + _.set(curObj, 'weaponDisplayName') + ' - +'+_.get(curObj, 'score'),
							20
						);
					}

					dbMapServiceController.statSrvEventActions('save', serverName, curObj);


				})
				.catch(function (err) {
					console.log('Eevent: ', curObj, err);
					dbMapServiceController.statSrvEventActions('save', serverName, curObj);
				});
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_TAKEOFF') {
			// Occurs when an aircraft takes off from an airbase, farp, or ship.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			_.set(curObj, 'place', _.get(queObj, 'data.arg5'));
			_.set(curObj, 'subPlace', _.get(queObj, 'data.arg6'));
			// console.log('event: ', curObj);

			// obj cmd for sending mesg to clients
			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			var place;
			if (_.get(curObj, 'subPlace')){
				place = ' from '+_.get(curObj, 'subPlace');
			} else if (_.get(curObj, 'place')) {
				place = ' from '+_.get(curObj, 'place');
			} else {
				place = '';
			}
			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' has taken off' + place,
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_LAND') {
			// Occurs when an aircraft lands at an airbase, farp or ship
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			_.set(curObj, 'place', _.get(queObj, 'data.arg5'));
			_.set(curObj, 'subPlace', _.get(queObj, 'data.arg6'));
			// console.log('event: ', curObj);

			// obj cmd for sending mesg to clients
			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			var place;
			if (_.get(curObj, 'subPlace')){
				place = ' at '+_.get(curObj, 'subPlace');
			} else if (_.get(curObj, 'place')) {
				place = ' at '+_.get(curObj, 'place');
			} else {
				place = '';
			}
			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' has landed' + place,
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_CRASH') {
			// Occurs when any aircraft crashes into the ground and is completely destroyed.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			// console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}


			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+ getSide(_.get(curObj, 'iPlayerSide'))+' '+ curName +' has crashed',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_EJECTION') {
			// Occurs when a pilot ejects from an aircraft
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+getSide( _.get(curObj, 'iPlayerSide'))+' '+ curName +' ejected',
				5
			);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING') {
			// Occurs when an aircraft connects with a tanker and begins taking on fuel.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			// console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' began refueling',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_DEAD') {
			// Occurs when an object is completely destroyed.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			// console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+getSide(_.get(curObj, 'iPlayerSide'))+' '+ curName +' pilot is dead',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') {
			// Occurs when the pilot of an aircraft is killed.
			// Can occur either if the player is alive and crashes or
			// if a weapon kills the pilot without completely destroying the plane.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			// console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToAll(
				serverName,
				'A: '+getSide(_.get(curObj, 'iPlayerSide'))+' '+ curName +' is dead',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_BASE_CAPTURED') {
			// Occurs when a ground unit captures either an airbase or a farp.
			// not used - capture system is new
			//console.log('event: ', queObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_MISSION_START') {
			// Occurs when a mission starts
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_MISSION_END') {
			// Occurs when a mission ends.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_TOOK_CONTROL') {
			// ?
			//console.log('event: ', queObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') {
			// Occurs when an aircraft is finished taking fuel.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' ended refueling',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_BIRTH') {
			// Occurs when any object is spawned into the mission.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			/*
			we dont really need to know when things spawn
			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' has spawned'
			);
			*/

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_HUMAN_FAILURE') {
			// Occurs when any system fails on a human controlled aircraft.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' is having trouble with his aircraft',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_ENGINE_STARTUP') {
			// Occurs when any aircraft starts its engines.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' has started his engine',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_ENGINE_SHUTDOWN') {
			// Occurs when any aircraft shuts down its engines.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' has shutdown his engine',
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') {
			// Occurs when any player assumes direct control of a unit.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' enters a brand new ' + _.set(curObj, 'iPlayerUnitType'),
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') {
			// Occurs when any player relieves control of a unit to the AI.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);

			var curName;
			if (_.get(curObj, 'iPlayerName')){
				curName = _.get(curObj, 'iPlayerName');
			} else {
				curName = _.get(curObj, 'iPlayerUnitType', '""');
			}

			console.log('line1541 unit type: ', _.get(curObj, 'iPlayerUnitType'));

			DCSLuaCommands.sendMesgToCoalition(
				_.get(curObj, 'iPlayerSide'),
				serverName,
				'C: '+ curName +' leaves his ' + _.set(curObj, 'iPlayerUnitType'),
				5
			);

			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_COMMENT') {
			// ?
			console.log('event: ', queObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_SHOOTING_START') {
			// Occurs when any unit begins firing a weapon that has a high rate of fire.
			// Most common with aircraft cannons (GAU-8), autocannons, and machine guns.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(shootingUsers, [iPlayer.ucid, 'startTime'], new Date().getTime());
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
			_.set(curObj, 'tPlayerUnitId', _.get(queObj, 'data.arg4'));
			tUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg4});
			if (tUnit) {
				_.set(curObj, 'tPlayerUnitType', _.get(tUnit, 'type', ''));
				_.set(curObj, 'tPlayerSide', _.get(tUnit, 'coalition', 0));
				_.set(curObj, 'tPlayerName', _.get(tUnit, 'playername', ''));
				if (tUnit.playername !== '') {
					tPlayer = _.find(curServers[serverName].serverObject.players, {name: tUnit.playername});
					if (tPlayer) {
						_.set(curObj, 'tPlayerUcid', tPlayer.ucid);
					}
				}
			}
			console.log('event: ', curObj);
			dbMapServiceController.statSrvEventActions('save', serverName, curObj);
		}
		if (_.get(queObj, 'action') === 'S_EVENT_SHOOTING_END') {
			// Occurs when any unit stops firing its weapon.
			// Event will always correspond with a shooting start event.
			curObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(curObj, 'time', _.get(queObj, 'data.arg2'));
			_.set(curObj, 'iPlayerUnitId', _.get(queObj, 'data.arg3'));
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				_.set(curObj, 'iPlayerUnitType', _.get(iUnit, 'type', ''));
				_.set(curObj, 'iPlayerSide', _.get(iUnit, 'coalition', 0));
				_.set(curObj, 'iPlayerName', _.get(iUnit, 'playername', ''));
				if (iUnit.playername !== '') {
					iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
					if (iPlayer) {
						_.set(curObj, 'iPlayerUcid', iPlayer.ucid);
					}
				}
			}
		}
		return true;
	});
});

//emit payload, every sec to start
setInterval(function () { //sending FULL SPEED AHEAD, 1 per milsec (watch for weird errors, etc)
	dbSystemServiceController.serverActions('read')
		.then(function (resp) {
			_.forEach(resp, function (server) {
				if (server.enabled) {
					_.forEach(socketQues, function (que) {
						if (curServers[server.name]) {
							var sendAmt = 0;
							if (curServers[server.name].updateQue[que].length < config.perSendMax) {
								sendAmt = curServers[server.name].updateQue[que].length;
							} else {
								sendAmt = config.perSendMax
							}
							//console.log('message send, sending: ', sendAmt);
							var chkPayload = {que: []};
							for (x = 0; x < sendAmt; x++) {
								chkPayload.que.push(curServers[server.name].updateQue[que][0]);
								_.set(chkPayload, 'name', server.name);
								curServers[server.name].updateQue[que].shift();
							}
							if (chkPayload.que.length) {
								io.to(server.name + '_' + que).emit('srvUpd', chkPayload);
							}
						}
					});
				}
			});
		})
		.catch(function (err) {
			console.log('line1638', err);
		});
	;
}, 500);

//dcs socket engine connection handler
setInterval(function () {
	dbSystemServiceController.serverActions('read')
		.then(function (resp) {
			_.forEach(resp, function (server) {
				if (server.enabled) {
					if (_.has(curServers, server.name)) {
						if (curServers[server.name].DCSSocket.clientConnOpen === true) {
							curServers[server.name].DCSSocket.connectClient();
						}
						if (curServers[server.name].DCSSocket.gameGUIConnOpen === true) {
							curServers[server.name].DCSSocket.connectServer();
						}
					} else {
						_.set(curServers, [server.name, 'serverObject'], {
							units: [],
							bases: [],
							players: [],
							ClientRequestArray: [],
							GameGUIRequestArray: []
						});

						_.set(curServers, [server.name, 'updateQue'], {
							q0: [],
							q1: [],
							q2: [],
							qadmin: []
						});
						curServers[server.name].DCSSocket = new DCSSocket.createSocket(server.name, server.ip, server.dcsClientPort, server.dcsGameGuiPort, syncDCSData, io, initClear);
					}
				}
			});
		})
		.catch(function (err) {
			console.log('line1677', err);
		})
		;
}, 1 * 1 * 5000);

function syncDCSData(serverName, sessionName, DCSData) {
	//console.log('incoming data: ', DCSData);
	//var timetest = new Date();
	//_.set(serverObject, 'ClientRequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'trigger.action.outText("IT WORKS MOFO!", 2)'});
	//accept updates

	if (!_.isEmpty(DCSData.que)) {
		var newSession = {
			_id: sessionName,
			name: sessionName
		};
		if (DCSData.curAbsTime) {
			_.set(newSession, 'startAbsTime', DCSData.startAbsTime);
			_.set(newSession, 'curAbsTime', DCSData.curAbsTime);
		}
		if (sessionName !== _.get(curServers, [serverName, 'sessionName'], '') || _.get(curServers, [serverName, 'curAbsTime'], 0) > DCSData.curAbsTime) {
			_.set(curServers, [serverName, 'sessionName'], sessionName);
			_.set(curServers, [serverName, 'curAbsTime'], DCSData.curAbsTime);
			dbMapServiceController.statSessionActions('save', serverName, newSession);
		} else {

			dbMapServiceController.statSessionActions('update', serverName, newSession);
		}
		curServers.processQue(serverName, sessionName, DCSData);
	}
}
