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
router.route('/srvEvents/:serverName')
	.get(function (req, res) {
		_.set(req, 'body.serverName', req.params.serverName);
		dbMapServiceController.statSessionActions('readLatest', req.body.serverName, req.body)
			.then(function(sesResp) {
				_.set(req, 'body.sessionName', _.get(sesResp, 'name'));
				dbMapServiceController.simpleStatEventActions('read', req.body.serverName, req.body)
					.then(function (resp) {
						res.json(resp);
					})
				;
			})
			.catch(function (err) {
				console.log('line 133 err: ', err);
			})
		;
	});
router.route('/srvEvents/:serverName/:sessionName')
	.get(function (req, res) {
		_.set(req, 'body.serverName', req.params.serverName);
		_.set(req, 'body.sessionName', req.params.sessionName);
		dbMapServiceController.simpleStatEventActions('read', req.body.serverName, req.body)
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
var socketQues = ['q0', 'q1', 'q2', 'qadmin', 'leaderboard'];
var curServers = {};
var nonaccountUsers = {};
var shootingUsers = {};
var place;
var sessionName;

function abrLookup (fullName) {
 var shortNames =	{
		players: 'TR',
	 	friendly_fire: 'FF',
		self_kill: 'SK',
		connect: 'C',
		disconnect: 'D',
		S_EVENT_SHOT: 'ST',
		S_EVENT_HIT: 'HT',
		S_EVENT_TAKEOFF: 'TO',
		S_EVENT_LAND: 'LA',
		S_EVENT_CRASH: 'CR',
		S_EVENT_EJECTION: 'EJ',
		S_EVENT_REFUELING: 'SR',
		S_EVENT_DEAD: 'D',
		S_EVENT_PILOT_DEAD: 'PD',
		S_EVENT_REFUELING_STOP: 'RS',
		S_EVENT_BIRTH: 'B',
		S_EVENT_PLAYER_ENTER_UNIT: 'EU',
		S_EVENT_PLAYER_LEAVE_UNIT: 'LU'
	};
	return _.get(shortNames, [fullName]);
}

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
	console.log('INIT UNITS');
	var iCurObj;
	var initQue = {que: []};
	var curIP = _.get(io, ['sockets', 'connected', socketID, 'conn', 'remoteAddress'], false);
	curIP = _.replace(curIP, "::ffff:", "");

	if(curIP) {
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
						var pSide = 0;
						var findPSide;
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
							findPSide = _.find(srvPlayers, function (player) {
								return _.includes(player.ipaddr, curIP);
							});

							if (findPSide) {
								pSide = findPSide.side;
							}
						}
						if (_.get(curServers, [serverName, 'serverObject', 'units'], []).length > 0 && pSide !== 0) {
							_.forEach(_.get(curServers, [serverName, 'serverObject', 'units'], []), function (unit) {
								if ((_.get(unit, 'coalition') === pSide && !_.get(unit, 'dead'))|| pSide === 'admin' && !_.get(unit, 'dead')) {
									iCurObj = {
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
									initQue.que.push(_.cloneDeep(iCurObj));
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
}

//initArray Push
function sendInit(serverName, socketID, authId) {
	// console.log('SI: ', serverName, socketID, authId);
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
	if (_.get(socket, 'room')) {
		socket.leave(socket.room);
	}
	_.set(socket, 'room', room);
	socket.join(room);
}

function setRoomSide(socket, roomObj) {
	var srvPlayer;
	var pSide;
	var iUnit;
	var iPlayer;
	var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
	if (curIP === ':10308') {
		curIP = '127.0.0.1';
	}

	if (_.includes(roomObj.server, 'leaderboard')) {
		setSocketRoom(socket, roomObj.server);
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
								sendInit(roomObj.server, socket.id, roomObj.authId);
							}
						})
						.catch(function (err) {
							console.log('line392', err);
						});
					;
				} else {
					dbMapServiceController.srvPlayerActions('read', roomObj.server)
						.then(function (srvPlayers) {
							_.forEach(srvPlayers, function (player) { // {ipaddr: curIP}
								if (_.includes(player.ipaddr, curIP)) {
									setSocketRoom(socket, roomObj.server + '_q' + player.side);
									_.set(nonaccountUsers, [player.ucid], socket);
								}
							});
							/*
							console.log('curplayer: ', curPlayer);
							if( !_.isEmpty(curPlayer) ) {
								setSocketRoom(socket, roomObj.server + '_q' + curPlayer.side);
								_.set(nonaccountUsers, [curPlayer.ucid, curSocket], socket);
								console.log('CHECK: ', nonaccountUsers);
								sendInit(roomObj.server, socket.id, roomObj.authId);
							} else {
								console.log('no side found, joining q0');
								setSocketRoom(socket, roomObj.server + '_q0' );
							}
							*/
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
		var aliveFilter = _.filter(_.get(curServers, [serverName, 'serverObject', 'units']), function(unit) { return !unit.dead; });
		if (update.unitCount !== aliveFilter.length) {
			console.log('out of sync '+outOfSyncUnitCnt+' times for ' + serverName + ' units: '+ update.unitCount + ' verse ' + aliveFilter.length);
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
			if (outOfSyncUnitCnt > 0) {
				console.log('Units Resynced');
				outOfSyncUnitCnt = 0;
			}
		}
	}

	_.forEach(update.que, function (queObj) {
		var iCurObj = {};
		var iPlayer = {};
		var tPlayer = {};
		var iUnit = {};
		var tUnit = {};
		var curUnit = _.find(curServers[serverName].serverObject.units, {'unitID': _.get(queObj, 'data.unitID')});

		if (_.get(queObj, 'action') === 'C') {
			if (curUnit) {
				curUnit.action = 'U';
			} else {
				// console.log('A: ', _.get(queObj, 'data.unitID'));
				iCurObj = {
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

				dbMapServiceController.unitActions('save', serverName, iCurObj.data);
				curServers[serverName].updateQue['q' + parseFloat(_.get(queObj, 'data.coalition'))].push(_.cloneDeep(iCurObj));
				curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));

				_.set(iCurObj, ['data', 'dead'], false);
				curServers[serverName].serverObject.units.push(_.cloneDeep(iCurObj.data));
			}
		}
		if (_.get(queObj, 'action') === 'U') {
			if (curUnit) {
				curUnit.lat = parseFloat(_.get(queObj, 'data.lat'));
				curUnit.lon = parseFloat(_.get(queObj, 'data.lon'));
				curUnit.alt = parseFloat(_.get(queObj, 'data.alt'));
				curUnit.hdg = parseFloat(_.get(queObj, 'data.hdg'));
				curUnit.speed = parseFloat(_.get(queObj, 'data.speed'));
				_.set(curUnit, ['dead'], false);
				// console.log('U: ', curUnit);
				iCurObj = {
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
				dbMapServiceController.unitActions('update', serverName, iCurObj.data);

				curServers[serverName].updateQue['q' + curUnit.coalition].push(_.cloneDeep(iCurObj));
				curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
			}
		}
		if (_.get(queObj, 'action') === 'D') {
			iCurObj = {
				action: 'D',
				sessionName: sessionName,
				data: {
					_id: parseFloat(_.get(queObj, 'data.unitID')),
					unitID: _.get(queObj, 'data.unitID')
				}
			};

			dbMapServiceController.unitActions('delete', serverName, iCurObj.data);
			// _.remove(curServers[serverName].serverObject.units, {'unitID': _.get(queObj, 'data.unitID')});
			curServers[serverName].updateQue.q1.push(_.cloneDeep(iCurObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(iCurObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));

			if (curUnit) {
				// console.log('D: ', _.get(queObj, 'data.unitID'));
				_.set(curUnit, ['dead'], true);
			}
				//_.set(curServers, [serverName, 'serverObject', 'units', 'dead'], true);
		}

		//playerUpdate
		if (_.get(queObj, 'action') === 'players') {
			_.set(queObj, 'sessionName', sessionName);
			var switchedPlayer;
			_.forEach(queObj.data, function (player) {
				if (player !== null) {
					var matchPlayer = _.find(curServers[serverName].serverObject.players, {ucid: player.ucid});
					if(matchPlayer) {
						//check for banned players
						dbSystemServiceController.banUserActions('read', player.ucid)
							.then(function (banUser) {
								if (!_.isEmpty(banUser)){
									console.log('Banning User: ', _.get(player, 'name'), _.get(player, 'ucid'));
									DCSLuaCommands.kickPlayer(
										serverName,
										_.get(player, 'id'),
										'You have been banned from this server, visit 16agr.com if you have questions'
									);
								}

								// switching to spectator gets around this, fix this in future please
								if ((matchPlayer.side !== player.side) && player.side !== 0 && _.get(player, 'side')) {
									if (_.get(matchPlayer, 'side')) {
										iCurObj = {
											sessionName: sessionName,
											eventCode: abrLookup(_.get(queObj, 'action')),
											iucid: _.get(player, 'ucid'),
											iName: _.get(player, 'name'),
											displaySide: 'A',
											roleCode: 'I',
											msg: 'A: '+getSide(_.get(matchPlayer, 'side'))+' '+_.get(player, 'name')+' has commited Treason and switched to '+getSide(_.get(player, 'side'))+'. Shoot on sight! -1000pts',
											score: -1000,
											showInChart: true
										};
										if(_.get(iCurObj, 'iucid')) {
											curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
											dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
										}

										DCSLuaCommands.sendMesgToAll(
											serverName,
											_.get(iCurObj, 'msg'),
											15
										);
									}
									dbSystemServiceController.userAccountActions('read')
										.then(function (resp) {
											var curSocket;
											var switchedPlayerSocket = nonaccountUsers[player.ucid];
											var switchedPlayer = _.find(resp, {ucid: player.ucid});
											if(switchedPlayerSocket) {
												if (player.side === 1 || player.side === 2) {
													setSocketRoom(switchedPlayerSocket, serverName + '_q' + player.side);
													sendInit(serverName, switchedPlayerSocket);
												}
											} else if (switchedPlayer) {
												curSocket = io.sockets.connected[_.get(switchedPlayer, 'curSocket')];
												console.log('cursock: ', curSocket);
												if (switchedPlayer.permLvl < 20) {
													setSocketRoom(curSocket, serverName + '_padmin');
												} else if (player.side === 1 || player.side === 2) {
													setSocketRoom(curSocket, serverName + '_q' + player.side);
													sendInit(serverName, curSocket);
												}
											}
										})
										.catch(function (err) {
											console.log('line626', err);
										});
									;
								}
							})
							.catch(function (err) {
								console.log('line654', err);
							});
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
				iCurObj = {
					_id: key,
					name: key,
					coalition: value
				};
				dbMapServiceController.baseActions('update', serverName, iCurObj);
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
			iCurObj = {
				sessionName: sessionName,
				eventCode: abrLookup(_.get(queObj, 'action')),
				displaySide: 'A',
				roleCode: 'I',
				showInChart: true
			};
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				_.set(iCurObj, 'iucid', _.get(iPlayer, 'ucid'));
				_.set(iCurObj, 'iName', _.get(iPlayer, 'name'));
			}
			tPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg3});
			if (tPlayer) {
				_.set(iCurObj, 'tucid', _.get(tPlayer, 'ucid'));
				_.set(iCurObj, 'tName', _.get(tPlayer, 'name'));
			}
			if(_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
				curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
				dbMapServiceController.statSrvEventActions('save', serverName, iCurObj);
				DCSLuaCommands.sendMesgToAll(
					serverName,
					'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has accidentally killed '+_.get(tPlayer, 'name')+' with a '+_.get(queObj, 'data.arg2')+' - 100pts',
					15
				);
			}
		}

		if (_.get(queObj, 'action') === 'self_kill') {
			// "self_kill", playerID
			iCurObj = {sessionName: sessionName, name: queObj.data.name};
			_.set(iCurObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				iCurObj = {
					sessionName: sessionName,
					eventCode: abrLookup(_.get(queObj, 'action')),
					iucid: _.get(iPlayer, 'ucid'),
					iName: _.get(iPlayer, 'name'),
					displaySide: 'A',
					roleCode: 'I',
					msg: 'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has killed himself'
				};
				if(_.get(iCurObj, 'iucid')) {
					// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
					dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
				}

				DCSLuaCommands.sendMesgToAll(
					serverName,
					_.get(iCurObj, 'msg'),
					15
				);
			}
		}

		if (_.get(queObj, 'action') === 'connect') {
			// "connect", playerID, name - no ucid lookup yet
			DCSLuaCommands.sendMesgToAll(
				serverName,
				'curTxt', 'A: '+_.get(queObj, 'data.arg2')+' has connected',
				5
			);
		}
		if (_.get(queObj, 'action') === 'disconnect') {
			// "disconnect", playerID, name, playerSide, reason_code
			iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
			if (iPlayer) {
				iCurObj = {
					sessionName: sessionName,
					eventCode: abrLookup(_.get(queObj, 'action')),
					iucid: _.get(iPlayer, 'ucid'),
					iName: _.get(iPlayer, 'name'),
					displaySide: 'A',
					roleCode: 'I',
					msg: 'A: '+_.get(iPlayer, 'name')+' has disconnected - Ping:'+_.get(iPlayer, 'ping')+' Lang:'+_.get(iPlayer, 'lang')
				};
				if(_.get(iCurObj, 'iucid')) {
					// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
					dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
				}
				DCSLuaCommands.sendMesgToAll(
					serverName,
					_.get(iCurObj, 'msg'),
					5
				);
			}
		}

		if (_.get(queObj, 'action') === 'S_EVENT_SHOT') {
			// Occurs whenever any unit in a mission fires a weapon.
			// But not any machine gun or autocannon based weapon,
			// those are handled by shooting_start.
			// arg1 = id
			// arg2 = time
			// arg3 = initiatorId
			// arg7 = weapon
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				dbSystemServiceController.weaponScoreActions('read', _.get(queObj, 'data.arg7'))
					.then(function (weaponResp) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(iUnit, 'playername'),
								displaySide: _.get(iUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ getSide(_.get(iUnit, 'coalition'))+' '+ _.get(iUnit, 'playername') +' released a ' + _.get(weaponResp, 'displayName'),
								showInChart: true
							};
							if(_.get(iCurObj, 'iucid')) {
								curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
								dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
							}
						}
					})
					.catch(function (err) {
						console.log('erroring line898');
					})
				;
			}
		}

		//run each tick to see if we need to write gun event
		if(_.keys(shootingUsers).length > 0) {
			_.forEach(shootingUsers, function (user, key) {
				if(_.get(user, ['startTime']) + 1500 < new Date().getTime()){
					var shootObj = _.get(user, ['iCurObj']);
					_.set(shootObj, 'score', _.get(shootingUsers, [iUnitId, 'count']));
					if(_.get(shootObj, 'iucid') || _.get(shootObj, 'tucid')) {
						curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', _.get(user, ['serverName']), shootObj);
					}
					DCSLuaCommands.sendMesgToAll(
						_.get(user, ['serverName']),
						_.get(shootObj, 'msg'),
						20
					);
					delete shootingUsers[key];
				}
			});
		}

		if (_.get(queObj, 'action') === 'S_EVENT_HIT') {
			var iPucid;
			var tPucid;
			var iUnitId = queObj.data.arg3;
			var tUnitId = queObj.data.arg4;
			var iPName;
			var tPName;
			// console.log('eventhit');
			// Occurs whenever an object is hit by a weapon.
			// arg1 = id
			// arg2 = time
			// arg3 = initiatorId
			// arg4 = targetId
			// arg7 = WeaponId
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: iUnitId});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iPucid = _.get(iPlayer, 'ucid');
					iPName = _.get(iUnit, 'playername') + '(' + _.get(iUnit, 'type') + ')';
				} else {
					iPName = _.get(iUnit, 'type')
				}
			}
			tUnit = _.find(curServers[serverName].serverObject.units, {unitID: tUnitId});
			if (tUnit) {
				tPlayer = _.find(curServers[serverName].serverObject.players, {name: tUnit.playername});
				if (tPlayer) {
					tPucid = _.get(tPlayer, 'ucid');
					tPName = _.get(tUnit, 'playername') + '(' + _.get(tUnit, 'type') + ')';
				} else {
					tPName = _.get(tUnit, 'type')
				}
			}

			iCurObj = {
				sessionName: sessionName,
				eventCode: abrLookup(_.get(queObj, 'action')),
				iucid: iPucid,
				iName: _.get(iUnit, 'playername'),
				tucid: tPucid,
				tName: _.get(tUnit, 'playername'),
				displaySide: 'A',
				roleCode: 'I',
				showInChart: true
			};

			if( _.get(queObj, ['data', 'arg7', 'typeName'])){
				console.log('weaponhere: ', _.get(queObj, ['data', 'arg7', 'typeName']));
				dbSystemServiceController.weaponScoreActions('read', _.get(queObj, 'data.arg7'))
					.then(function (weaponResp) {
						// if (_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
						if (_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
							if (_.startsWith(_.get(weaponResp, 'name'), 'weapons.shells')){
								_.set(shootingUsers, [iUnitId, 'count'], _.get(shootingUsers, [iUnitId, 'count'], 0)+1);
								_.set(shootingUsers, [iUnitId, 'startTime'], new Date().getTime());
								_.set(shootingUsers, [iUnitId, 'serverName'], serverName);
								_.set(iCurObj, 'msg',
									'A: '+ getSide(_.get(iUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(tUnit, 'coalition'))+' ' + tPName + ' '+_.get(shootingUsers, [iUnitId, 'count'], 0)+' times with ' + _.get(weaponResp, 'displayName') + ' - +'+_.get(weaponResp, 'score')+' each.'
								);
								_.set(shootingUsers, [iUnitId, 'iCurObj'], _.cloneDeep(iCurObj));
							} else {
								_.set(iCurObj, 'score', _.get(weaponResp, 'score'));
								_.set(iCurObj, 'msg', 'A: '+ getSide(_.get(iUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(tUnit, 'coalition'))+' '+tPName + ' with ' + _.get(weaponResp, 'displayName') + ' - +'+_.get(weaponResp, 'score'));
								if(_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
									curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
									dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
								}
								DCSLuaCommands.sendMesgToAll(
									serverName,
									_.get(iCurObj, 'msg'),
									20
								);
							}
						}
					})
					.catch(function (err) {
						console.log('Eevent line998: ', iCurObj, err);
						if(_.get(iCurObj, 'iPlayerUcid') || _.get(iCurObj, 'tPlayerUcid')) {
							// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
							// dbMapServiceController.statSrvEventActions('save', serverName, iCurObj);
						}
					})
				;
			} else {
				console.log('weapon not here');
				console.log('weapon: ', _.get(queObj, ['data', 'arg7', 'typeName']));
				_.set(shootingUsers, [iUnitId, 'count'], _.get(shootingUsers, [_.get(iCurObj, 'iPlayerUnitId'), 'count'], 0)+1);
				_.set(shootingUsers, [iUnitId, 'startTime'], new Date().getTime());
				_.set(shootingUsers, [iUnitId, 'serverName'], serverName);
				_.set(iCurObj, 'msg',
					'A: '+ getSide(_.get(iUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(tUnit, 'coalition'))+' ' + tPName + ' '+_.get(shootingUsers, [iUnitId, 'count'], 0)+' times with ' + _.get(iUnit, 'type') + ' - +1 each.'
				);
				_.set(shootingUsers, [iUnitId, 'iCurObj'], _.cloneDeep(iCurObj));
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_TAKEOFF') {
			// Occurs when an aircraft takes off from an airbase, farp, or ship.
			if (_.get(queObj, 'data.arg6')){
				place = ' from '+_.get(queObj, 'data.arg6');
			} else if (_.get(queObj, 'data.arg5')) {
				place = ' from '+_.get(queObj, 'data.arg5');
			} else {
				place = '';
			}
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername')+ '('+_.get(iUnit, 'type')+') has taken off' + place
					};
					if(_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_LAND') {
			// Occurs when an aircraft lands at an airbase, farp or ship
			if (_.get(queObj, 'data.arg6')){
				place = ' at '+_.get(queObj, 'data.arg6');
			} else if (_.get(queObj, 'data.arg5')) {
				place = ' at '+_.get(queObj, 'data.arg5');
			} else {
				place = '';
			}
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if(iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type') + ') has landed' + place
					};
					if(_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_CRASH') {
			// Occurs when any aircraft crashes into the ground and is completely destroyed.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: 'A',
						roleCode: 'I',
						msg: 'A: '+ getSide(_.get(iUnit, 'coalition'))+' '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') has crashed'
					};
					if(_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToAll(
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_EJECTION') {
			// Occurs when a pilot ejects from an aircraft
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: 'A',
						roleCode: 'I',
						msg: 'A: '+getSide(_.get(iUnit, 'coalition'))+' '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') ejected'
					};
					if(_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToAll(
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING') {
			// Occurs when an aircraft connects with a tanker and begins taking on fuel.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: ' + _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') began refueling',
						showInChart: true
					};
					if (_.get(iCurObj, 'iucid')) {
						curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_DEAD') {
			// Occurs when an object is completely destroyed.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: 'A',
						roleCode: 'I',
						msg: 'A: '+getSide(_.get(iUnit, 'playername'))+' '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') is dead'
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToAll(
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') {
			// Occurs when the pilot of an aircraft is killed.
			// Can occur either if the player is alive and crashes or
			// if a weapon kills the pilot without completely destroying the plane.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: 'A',
						roleCode: 'I',
						msg: 'A: '+getSide(_.get(iUnit, 'coalition'))+' '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') pilot is dead'
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToAll(
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') {
			// Occurs when an aircraft is finished taking fuel.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if(iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername') + '('+_.get(iUnit, 'type')+') ended refueling',
						showInChart: true
					};
					if (_.get(iCurObj, 'iucid')) {
						curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}

		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') {
			// Occurs when any player assumes direct control of a unit.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername') +' enters a brand new ' + _.get(iUnit, 'type')
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_BIRTH') {
			// Occurs when any object is spawned into the mission.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername') +' enters a brand new ' + _.get(iUnit, 'type')
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') {
			// Occurs when any player relieves control of a unit to the AI.
			iUnit = _.find(curServers[serverName].serverObject.units, {unitID: queObj.data.arg3});
			if (iUnit) {
				iPlayer = _.find(curServers[serverName].serverObject.players, {name: iUnit.playername});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: abrLookup(_.get(queObj, 'action')),
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(iUnit, 'playername'),
						displaySide: _.get(iUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(iUnit, 'playername') +' leaves his ' + _.get(iUnit, 'type')
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToCoalition(
						_.get(iCurObj, 'displaySide'),
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
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
		})
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
							qadmin: [],
							leaderboard: []
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

function syncDCSData(serverName, DCSData) {
	if (!_.isEmpty(DCSData.que)) {
		if (DCSData.epoc) {
			sessionName = serverName+'_'+DCSData.epoc;
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
		}
		if (sessionName) {
			curServers.processQue(serverName, sessionName, DCSData);
		}
	}
}
