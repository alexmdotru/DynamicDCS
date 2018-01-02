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
const DCSBuildMap = require('./controllers/DCSBuildMap');
const groupController = require('./controllers/group');
const proximityController = require('./controllers/proximity');
const menuUpdateController = require('./controllers/menuUpdate');
const menuCmdsController = require('./controllers/menuCmds');
const jtacController = require('./controllers/jtac');

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

//setup globals
var epocTimeout = (1 * 60 * 1000); // 5 mins
var maxIdleTime = (5 * 60 * 1000); // 5 mins
var outOfSyncUnitCnt = 0;
var socketQues = ['q0', 'q1', 'q2', 'qadmin', 'leaderboard'];
var curServers = {};
var nonaccountUsers = {};
var shootingUsers = {};
var place;
var sessionName;
var polyTry = 50;
var isBasePop = false;
var srvPolyCnt = 0;
var polyFailCount = 0;
var polyNotLoaded = true;
var srvDbNotLoaded = {};
var baseSpawnTimeout = {};
var epocToPayAttention = new Date().getTime() + epocTimeout;
var isSpawningAllowed = false;
var isBaseFullyPopped = false;

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
		// read from DB
		//Unit.collection.drop();
		// dbMapServiceController.unitActions('dropall', serverName); //someday maps will persist, reset all units
	}
}

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

function initUnits(serverName, socketID, authId) {
	console.log('INIT UNITS line:256');
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
											unitId: parseFloat(_.get(unit, 'unitId')),
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
					})
				;
			})
			.catch(function (err) {
				console.log('line309', err);
			})
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
								// sendInit(roomObj.server, socket.id, roomObj.authId);
							}
						})
						.catch(function (err) {
							console.log('line392', err);
						});
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
				}
			})
			.catch(function (err) {
				console.log('line418', err);
			});
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
	}
});

_.set(curServers, 'processQue', function (serverName, sessionName, update) {
	if (!_.get(srvDbNotLoaded, [serverName])) {
		groupController.initDbs(serverName);
		console.log('dbsyncRUN');
		dbMapServiceController.cmdQueActions('save', serverName, {
			queName: 'clientArray',
			actionObj: {action: "INIT"}
		});
		_.set(srvDbNotLoaded, [serverName], true);
	}
	if (!srvPolyCnt) {
		srvPolyCnt = _.get(update, 'polyCnt', 0);
	}
	dbMapServiceController.unitActions('read', serverName, {dead: false})
		.then(function (units) {
			if (update.epoc) {
				if (update.unitCount > 50 && units.length > 50) {
					// console.log('resync');
					if (units.length !== update.unitCount) {
						// get update sync from server
						console.log(outOfSyncUnitCnt + ':' + serverName + ':SERVER' + update.unitCount + '=DB' + units.length);
						if (outOfSyncUnitCnt > config.outOfSyncUnitThreshold) {
							dbMapServiceController.cmdQueActions('save', serverName, {
								queName: 'clientArray',
								actionObj: {action: "GETUNITSALIVE"}
							})
								.then(function () {
									outOfSyncUnitCnt = 0;
									console.log('reset server units');
									initClear(serverName, 'client');
									dbMapServiceController.cmdQueActions('save', serverName, {
										queName: 'clientArray',
										actionObj: {action: "INIT"}
									})
										.catch( function (err) {
											console.log('err line:579 ', err);
										})
									;
									// sendInit(serverName, 'all'); ?
								})
								.catch( function (err) {
									console.log('err line:584 ', err);
								})
							;
						} else {
							outOfSyncUnitCnt++;
						}
					} else {
						if (outOfSyncUnitCnt > 0) {
							console.log('Units Resynced');
							isBaseFullyPopped = true;
							outOfSyncUnitCnt = 0;
						}
					}
				} else {
					console.log('rePOP', (polyTry > 60), !isBasePop);
					if ((polyTry > 60) && !isBasePop) {
						console.log('buildDynamicMap');
						DCSBuildMap.buildDynamicMap(serverName);
						polyTry = 0;
						isBasePop = true;
					}
					polyTry++;
				}
			}
		})
		.catch(function (err) {
			console.log('err line538: ', err );
		})
	;

	_.forEach(update.que, function (queObj) {
		var iCurObj = {};
		var iPlayer = {};
		var tPlayer = {};
		var iUnit = {};
		var tUnit = {};

		//poly definition coming back
		if (polyNotLoaded) {
			dbMapServiceController.baseActions('read', serverName)
				.then( function (bases) {
					var mainBases = _.filter(bases, function (base) {
						return _.get(base, 'polygonLoc', []).length > 0
					});
					if(mainBases.length !== srvPolyCnt) {
						console.log('db server poly count does not match server: ', mainBases.length, '!==', srvPolyCnt, ' | ', polyFailCount);
						polyFailCount += 1;
						if (polyFailCount > 60) {
							console.log('GET POLYDEF');
							// dbMapServiceController.cmdQueActions('save', serverName, {queName: 'clientArray', actionObj: {action: "GETPOLYDEF"}});
							polyFailCount = 0;
						}
					} else {
						// console.log('polyzones loaded, populate base');
						polyNotLoaded = false;
					}
				})
				.catch( function (err) {
					console.log('err line:622 ', err);
				})
			;
		}

		// line of sight callback from server
		if (queObj.action === 'LOSVISIBLEUNITS') {
			//console.log('LOS: ', queObj);
			jtacController.processLOSEnemy(serverName, queObj);
		}

		if (queObj.action === 'unitsAlive') {
			var upPromises = [];
			console.log('isBasePopped: ', isBaseFullyPopped);
			dbMapServiceController.unitActions('chkResync', serverName, {})
				.then(function () {
					_.forEach(queObj.data, function (unitId) {
						upPromises.push(dbMapServiceController.unitActions('update', serverName, {_id: unitId, isResync: true, dead:false}));
					});
					Promise.all(upPromises)
						.then(function () {
							if(isBaseFullyPopped) {
								dbMapServiceController.unitActions('markUndead', serverName, {});
							} else {
								//send units not popped yet
								dbMapServiceController.unitActions('read', serverName, {isResync: false, dead: false})
									.then(function (units) {
										console.log('unitsLength: ', units.length);
										console.log('resyncUnits');
										//repop units at base
										var remappedunits = {};
										_.forEach(units, function (unit) {
											var curDead;
											var curGrpName = _.get(unit, 'groupName');
											if (_.get(unit, 'category') === 'GROUND') {
												_.set(remappedunits, [curGrpName], _.get(remappedunits, [curGrpName], []));
												remappedunits[curGrpName].push(unit);
											} else if (_.get(unit, 'category') === 'STRUCTURE') {
												// console.log('LOGIUNIT: ', unit.name);
												groupController.spawnLogisticCmdCenter(serverName, unit);
											}
										});
										_.forEach(remappedunits, function (group) {
											// console.log('spwned ', group);
											groupController.spawnGroup( serverName, group);
										});
									})
									.catch(function (err) {
										console.log('erroring line674: ', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('err line648: ', err);
						})
					;
				})
				.catch(function (err) {
					console.log('err line653: ', err);
				})
			;

		}

		//var curUnit = _.find(curServers[serverName].serverObject.units, {'unitId': _.get(queObj, 'data.unitId')});
		if ((_.get(queObj, 'action') === 'C') || (_.get(queObj, 'action') === 'U') || (_.get(queObj, 'action') === 'D'))  {
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, 'data.unitId')})
				.then(function (unit) {
					var stParse;
					var curUnit = _.get(unit, 0, {});
					var curData = _.get(queObj, 'data');
					// build out extra info on spawned items isAI
					if (_.includes(curData.name, 'AI|')) {
						stParse = _.split(curData.name, '|');
						_.set(curData, 'playerOwnerId', stParse[1]);
						_.set(curData, 'isAI', true);
					}
					if (_.includes(curData.name, 'TU|')) {
						stParse = _.split(curData.name, '|');
						_.set(curData, 'playerOwnerId', stParse[1]);
						_.set(curData, 'playerCanDrive', false);
						_.set(curData, 'isTroop', true);
						_.set(curData, 'spawnCat', stParse[2]);
					}
					if (_.includes(curData.name, 'CU|')) {
						stParse = _.split(curData.name, '|');
						_.set(curData, 'playerOwnerId', stParse[1]);
						_.set(curData, 'isCombo', _.isBoolean(stParse[5]));
						_.set(curData, 'playerCanDrive', false);
						_.set(curData, 'isCrate', true);
					}
					if (_.includes(curData.name, 'DU|')) {
						stParse = _.split(curData.name, '|');
						_.set(curData, 'playerOwnerId', stParse[1]);
						_.set(curData, 'proxChkGrp', stParse[3]);
						_.set(curData, 'playerCanDrive', stParse[5]);
					}
					if ((!_.isEmpty(curUnit) && _.get(queObj, 'action') !== 'D')) {
						if(!_.isEmpty(curData.playername) && curUnit.dead) {
							menuUpdateController.logisticsMenu('resetMenu', serverName, curData);
						}
						iCurObj = {
							action: 'U',
							sessionName: sessionName,
							data: {
								_id: parseFloat(_.get(queObj, 'data.unitId')),
								unitId: _.get(queObj, 'data.unitId'),
								lonLatLoc: _.get(queObj, 'data.lonLatLoc'),
								alt: parseFloat(_.get(queObj, 'data.alt')),
								hdg: parseFloat(_.get(queObj, 'data.hdg')),
								speed: parseFloat(_.get(queObj, 'data.speed', 0)),
								inAir: _.get(queObj, 'data.inAir'),
								dead: false
							}
						};
						dbMapServiceController.unitActions('update', serverName, iCurObj.data)
							.then(function () {
								curServers[serverName].updateQue['q' + _.get(curUnit, ['coalition'])].push(_.cloneDeep(iCurObj));
								curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
							})
							.catch(function (err) {
								console.log('update err line626: ', err);
							});
					}else if (_.get(queObj, 'action') === 'C') {
						if(!_.isEmpty(curData.playername)) {
							menuUpdateController.logisticsMenu('resetMenu', serverName, curData);
						}

						_.set(curData, '_id', _.get(curData, 'unitId'));
						iCurObj = {
							action: 'C',
							sessionName: sessionName,
							data: curData
						};
						if (curData.category === 'STRUCTURE') {
							if( _.includes(curData.name, ' Logistics')) {
								_.set(curData, 'proxChkGrp', 'logisticTowers');
							}
						}

						dbMapServiceController.unitActions('save', serverName, iCurObj.data)
							.then(function (unit) {
								curServers[serverName].updateQue['q' + parseFloat(_.get(queObj, 'data.coalition'))].push(_.cloneDeep(iCurObj));
								curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
							})
							.catch(function (err) {
								console.log('save err line643: ', err);
							});
					} else if (_.get(queObj, 'action') === 'D') {
						iCurObj = {
							action: 'D',
							sessionName: sessionName,
							data: {
								_id: parseFloat(_.get(queObj, 'data.unitId')),
								unitId: _.get(queObj, 'data.unitId'),
								dead: true
							}
						};
						dbMapServiceController.unitActions('update', serverName, iCurObj.data)
							.then(function (unit) {
								curServers[serverName].updateQue.q1.push(_.cloneDeep(iCurObj));
								curServers[serverName].updateQue.q2.push(_.cloneDeep(iCurObj));
								curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
							})
							.catch(function (err) {
								console.log('del err line663: ', err);
							})
						;
					}
				})
				.catch(function (err) {
					console.log('err line596: ', err);
				})
			;
		}

		//Base
		if (_.get(queObj, 'action') === 'airbaseC' || _.get(queObj, 'action') === 'airbaseU') {
			var curData = _.get(queObj, 'data');
			if (_.get(queObj, 'action') === 'airbaseC') {
				var curServer = _.get(curServers, [serverName, 'details']);
				_.set(curData, 'maxUnitThreshold', _.random(_.get(curServer, 'minUnits'), _.get(curServer, 'maxUnits')));
				dbMapServiceController.baseActions('save', serverName, curData)
					.catch(function (err) {
						console.log('err line:711 ', err);
					})
				;
			}
		}

		// menu Update
		if (_.get(queObj, 'action') === 'f10Menu') {
			_.set(queObj, 'serverName', serverName);
			_.set(queObj, 'sessionName', sessionName);
			menuCmdsController.menuCmdProcess(queObj);
		}
		//playerUpdate
		if (_.get(queObj, 'action') === 'players') {
			_.set(queObj, 'sessionName', sessionName);
			_.forEach(queObj.data, function (player) {
				if (player !== null) {
					var curPlyrUcid = _.get(player, 'ucid');
					var curPlyrSide = _.get(player, 'side');
					var curPlyrName = _.get(player, 'name');

					//kick if in gamemaster slot
					if(_.includes(_.get(player, 'slot', ''), 'instructor_')) {
						dbSystemServiceController.userAccountActions('read', {ucid: _.get(player, 'ucid', '')})
							.then(function (userAccount) {
								if(!(_.get(userAccount, [0, 'permLvl'], 100) <= 5)) {
									console.log('force out gamemaster!');
									DCSLuaCommands.forcePlayerSpectator(
										serverName,
										player.id,
										curPlyrName + ' does not have a high enough permission level to be a Gamemaster'
									);
								}
							})
							.catch(function (err) {
								console.log('line856', err);
							})
						;
					}

					dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, curPlyrUcid)})
						.then(function (unit) {
							var curUnit = _.get(unit, 0);
							var curUnitSide = _.get(curUnit, 'side');
							var curUnitUcid = _.get(curUnit, 'ucid');
							if(curUnit) {
								dbSystemServiceController.banUserActions('read', curPlyrUcid)
									.then(function (banUser) {
										if (!_.isEmpty(banUser)){
											console.log('Banning User: ', _.get(player, 'name'), curPlyrUcid);
											DCSLuaCommands.kickPlayer(
												serverName,
												_.get(player, 'id'),
												'You have been banned from this server, visit 16agr.com if you have questions'
											);
										}



										// switching to spectator gets around this, fix this in future please
										if ((curUnitSide !== curPlyrSide) && curPlyrSide !== 0 && curPlyrSide) {
											if (curUnitSide) {
												iCurObj = {
													sessionName: sessionName,
													eventCode: abrLookup(_.get(queObj, 'action')),
													iucid: curPlyrUcid,
													iName: curPlyrName,
													displaySide: 'A',
													roleCode: 'I',
													msg: 'A: '+getSide(curUnitSide)+' '+curPlyrName+' has commited Treason and switched to '+getSide(curPlyrSide)+'. Shoot on sight! -1000pts',
													score: -1000,
													showInChart: true
												};
												if(curPlyrUcid) {
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
													var switchedPlayerSocket = _.get(nonaccountUsers, curPlyrUcid);
													var switchedPlayer = _.find(resp, {ucid: curPlyrUcid});
													if(switchedPlayerSocket) {
														if (curPlyrSide === 1 || curPlyrSide === 2) {
															setSocketRoom(switchedPlayerSocket, serverName + '_q' + curPlyrSide);
															sendInit(serverName, switchedPlayerSocket);
														}
													} else if (switchedPlayer) {
														curSocket = io.sockets.connected[_.get(switchedPlayer, 'curSocket')];
														if (switchedPlayer.permLvl < 20) {
															setSocketRoom(curSocket, serverName + '_padmin');
														} else if (curPlyrSide === 1 || curPlyrSide === 2) {
															setSocketRoom(curSocket, serverName + '_q' + curPlyrSide);
															// sendInit(serverName, curSocket);
														}
													}
												})
												.catch(function (err) {
													console.log('line626', err);
												})
											;
										}
									})
									.catch(function (err) {
										console.log('line654', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('err line596: ', err);
						})
					;
				}
			});

			//need this for current player ID lookup
			curServers[serverName].serverObject.players = queObj.data;

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
			/*
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
			*/
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
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (unit) {
					var curUnit = _.get(unit, 0);
					if (curUnit) {
						dbSystemServiceController.weaponScoreActions('read', _.get(queObj, ['data', 'arg7']))
							.then(function (weaponResp) {
								var curIPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curUnit, 'playername')});
								var curIPlayerUcid =  _.get(iPlayer, 'ucid');
								var curIPlayerSide = _.get(curUnit, 'coalition');
								if (curIPlayer) {
									iCurObj = {
										sessionName: sessionName,
										eventCode: abrLookup(_.get(queObj, 'action')),
										iucid: curIPlayerUcid,
										iName: _.get(curUnit, 'playername'),
										displaySide: curIPlayerSide,
										roleCode: 'I',
										msg: 'C: '+ getSide(curIPlayerSide)+' '+ _.get(curUnit, 'playername') +' released a ' + _.get(weaponResp, 'displayName'),
										showInChart: false
									};
									if(curIPlayerUcid) {
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
				})
				.catch(function (err) {
					console.log('err line1007: ', err);
				})
			;
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
			dbMapServiceController.unitActions('read', serverName, {_id: iUnitId})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: curIUnit.playername});
						if (iPlayer) {
							iPucid = _.get(iPlayer, 'ucid');
							iPName = _.get(curIUnit, 'playername') + '(' + _.get(curIUnit, 'type') + ')';
						} else {
							iPName = _.get(curIUnit, 'type')
						}
					}
					dbMapServiceController.unitActions('read', serverName, {_id: tUnitId})
						.then(function (tunit) {
							var curTUnit = _.get(tunit, 0);
							if (curTUnit ) {
								tPlayer = _.find(curServers[serverName].serverObject.players, {name: curTUnit.playername});
								if (tPlayer) {
									tPucid = _.get(tPlayer, 'ucid');
									tPName = _.get(curTUnit, 'playername') + '(' + _.get(curTUnit, 'type') + ')';
								} else {
									tPName = _.get(curTUnit, 'type')
								}
							}

							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: iPucid,
								iName: _.get(curIUnit, 'playername'),
								tucid: tPucid,
								tName: _.get(curTUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								showInChart: true
							};

							if( _.get(queObj, ['data', 'arg7', 'typeName'])){
								console.log('weaponhere: ', _.get(queObj, ['data', 'arg7', 'typeName']));
								dbSystemServiceController.weaponScoreActions('read', _.get(queObj, ['data', 'arg7']))
									.then(function (weaponResp) {
										if (_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
											if (_.startsWith(_.get(weaponResp, 'name'), 'weapons.shells')){
												_.set(shootingUsers, [iUnitId, 'count'], _.get(shootingUsers, [iUnitId, 'count'], 0)+1);
												_.set(shootingUsers, [iUnitId, 'startTime'], new Date().getTime());
												_.set(shootingUsers, [iUnitId, 'serverName'], serverName);
												_.set(iCurObj, 'msg',
													'A: '+ getSide(_.get(curIUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(curTUnit, 'coalition'))+' ' + tPName + ' '+_.get(shootingUsers, [iUnitId, 'count'], 0)+' times with ' + _.get(weaponResp, 'displayName') + ' - +'+_.get(weaponResp, 'score')+' each.'
												);
												_.set(shootingUsers, [iUnitId, 'iCurObj'], _.cloneDeep(iCurObj));
											} else {
												_.set(iCurObj, 'score', _.get(weaponResp, 'score'));
												_.set(iCurObj, 'msg', 'A: '+ getSide(_.get(curIUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(curTUnit, 'coalition'))+' '+tPName + ' with ' + _.get(weaponResp, 'displayName') + ' - +'+_.get(weaponResp, 'score'));
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
									'A: '+ getSide(_.get(curIUnit, 'coalition'))+' '+ iPName +' has hit '+getSide(_.get(tUnit, 'coalition'))+' ' + tPName + ' '+_.get(shootingUsers, [iUnitId, 'count'], 0)+' times with ' + _.get(curIUnit, 'type') + ' - +1 each.'
								);
								_.set(shootingUsers, [iUnitId, 'iCurObj'], _.cloneDeep(iCurObj));
							}
						})
						.catch(function (err) {
							console.log('err line596: ', err);
						})
					;


				})
				.catch(function (err) {
					console.log('err line596: ', err);
				})
			;
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

			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername')+ '('+_.get(curIUnit, 'type')+') has taken off' + place
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
				})
				.catch(function (err) {
					console.log('err line596: ', err);
				})
			;
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

			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						//landed logistic planes/helis spawn new group for area
						var curUnitName = _.get(curIUnit, 'name');
						if (_.includes(curUnitName, 'LOGISTICS|')) {
							var bName = _.split(curUnitName, '|')[2];
							var curSide = _.get(curIUnit, 'coalition');
							dbMapServiceController.baseActions('read', serverName, {_id: bName})
								.then(function (bases) {
									var curBase = _.get(bases, [0], {}); // does this work?
									if (curBase.side === curSide) {
										groupController.replenishUnits( serverName, bName, curSide);
										groupController.healBase(serverName, bName);
									}
								})
								.catch(function (err) {
									console.log('err line1323: ', err);
								})
							;
						}

						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if(iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type') + ') has landed' + place
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
				})
				.catch(function (err) {
					console.log('err line1263: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_CRASH') {
			// Occurs when any aircraft crashes into the ground and is completely destroyed.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								msg: 'A: '+ getSide(_.get(curIUnit, 'coalition'))+' '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') has crashed'
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
				})
				.catch(function (err) {
					console.log('err line1297: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_EJECTION') {
			// Occurs when a pilot ejects from an aircraft
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								msg: 'A: '+getSide(_.get(curIUnit, 'coalition'))+' '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') ejected'
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
				})
				.catch(function (err) {
					console.log('err line1331: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING') {
			// Occurs when an aircraft connects with a tanker and begins taking on fuel.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: ' + _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') began refueling',
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
				})
				.catch(function (err) {
					console.log('err line1367: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_DEAD') {
			// Occurs when an object is completely destroyed.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								msg: 'A: '+getSide(_.get(curIUnit, 'playername'))+' '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') is dead'
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
				})
				.catch(function (err) {
					console.log('err line1401: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PILOT_DEAD') {
			// Occurs when the pilot of an aircraft is killed.
			// Can occur either if the player is alive and crashes or
			// if a weapon kills the pilot without completely destroying the plane.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								msg: 'A: '+getSide(_.get(curIUnit, 'coalition'))+' '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') pilot is dead'
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
				})
				.catch(function (err) {
					console.log('err line1437: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_REFUELING_STOP') {
			// Occurs when an aircraft is finished taking fuel.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if(iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') + '('+_.get(curIUnit, 'type')+') ended refueling',
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
				})
				.catch(function (err) {
					console.log('err line1473: ', err);
				})
			;
		}

		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_ENTER_UNIT') {
			// Occurs when any player assumes direct control of a unit.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') +' enters a brand new ' + _.get(curIUnit, 'type')
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
				})
				.catch(function (err) {
					console.log('err line1509: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_BIRTH') {
			// Occurs when any object is spawned into the mission.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') +' enters a brand new ' + _.get(curIUnit, 'type')
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
				})
				.catch(function (err) {
					console.log('err line596: ', err);
				})
			;
		}
		if (_.get(queObj, 'action') === 'S_EVENT_PLAYER_LEAVE_UNIT') {
			// Occurs when any player relieves control of a unit to the AI.
			dbMapServiceController.unitActions('read', serverName, {_id: _.get(queObj, ['data', 'arg3'])})
				.then(function (iunit) {
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(curServers[serverName].serverObject.players, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: abrLookup(_.get(queObj, 'action')),
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') +' leaves his ' + _.get(curIUnit, 'type')
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
				})
				.catch(function (err) {
					console.log('err line596: ', err);
				})
			;
		}
		return true;
	});
});

// distance checker loop
setInterval(function () {
	dbSystemServiceController.serverActions('read', {enabled: true})
		.then(function (srvs) {
			_.forEach(srvs, function (srv) {
				var curServerName = _.get(srv, '_id');

				if (!isSpawningAllowed) {
					if(epocToPayAttention < new Date().getTime()){
						console.log('Spawning is now active');
						isSpawningAllowed = true;
					}
				} else {
					//check Prox base units
					proximityController.checkUnitsToBaseForTroops(curServerName);

					//check logi prox
					proximityController.checkUnitsToLogisticTowers(curServerName);

					//checkBaseCap
					proximityController.checkUnitsToBaseForCapture(curServerName);
				}
			});
		})
		.catch(function (err) {
			console.log('line1491', err);
		})
	;
}, 1000);

// constant check loop (base unit replenish, etc)
//5 sec interval
setInterval(function () {
	dbSystemServiceController.serverActions('read', {enabled: true})
		.then(function (srvs) {
			_.forEach(srvs, function (srv) {
				var curServerName = _.get(srv, '_id');

				//cleanupAI maxIdleTime
				dbMapServiceController.unitActions('read', curServerName, {isAI: true, dead:false})
					.then(function (AICleanup) {
						_.forEach(AICleanup, function (AIUnit) {
							if (_.isEmpty(AIUnit.playername) && new Date(_.get(AIUnit, 'updatedAt', 0)).getTime() + maxIdleTime < new Date().getTime()) {
								groupController.destroyUnit( curServerName, AIUnit.name );
							}
						});
					})
					.catch(function (err) {
						console.log('err line596: ', err);
					})
				;

				//update server client lock
				dbMapServiceController.baseActions('getBaseSides', curServerName, {})
					.then(function (baseSides) {
						dbMapServiceController.cmdQueActions('save', curServerName, {
							queName: 'clientArray',
							actionObj: {
								action: "SETBASEFLAGS",
								data: baseSides
							}
						});
					})
					.catch(function (err) {
						console.log('line1491', err);
					})
				;

				if (isSpawningAllowed) {
					dbMapServiceController.baseActions('read', curServerName, {mainBase: true, $or: [{side: 1}, {side: 2}]})
						.then(function (bases) {
							_.forEach(bases, function (base) {
								var curRegEx = '^' + _.get(base, '_id') + ' #';
								var unitCnt = _.get(base, 'maxUnitThreshold') * ((100 - _.get(srv, 'replenThreshold')) * 0.01);
								dbMapServiceController.unitActions('read', curServerName, {name: new RegExp(curRegEx), dead: false})
									.then(function (units) {
										var replenEpoc = new Date(_.get(base, 'replenTime', 0)).getTime();
										if ((units.length < unitCnt) && replenEpoc < new Date().getTime()) { //UNCOMMENT OUT FALSE
											dbMapServiceController.baseActions('updateReplenTimer', curServerName, {name: _.get(base, '_id'),  replenTime: new Date().getTime() + (_.get(srv, 'replenTimer') * 1000)})
												.then(function () {
													if (base.farp) {
														dbMapServiceController.baseActions('read', curServerName, {_id: base.name + ' #' + base.side})
															.then(function (farpBase) {
																groupController.spawnSupportPlane(curServerName, base, base.side, _.get(farpBase, [0], {}));
															})
															.catch(function (err) {
																console.log('line 1775: ', err);
															})
														;
													} else {
														groupController.spawnSupportPlane(curServerName, base, base.side);
													}
												})
												.catch(function (err) {
													console.log('line 1487: ', err);
												})
											;
										}
									})
									.catch(function (err) {
										console.log('line 1482: ', err);
									})
								;
							});
						})
						.catch(function (err) {
							console.log('line1486', err);
						})
					;
				}
			});
		})
		.catch(function (err) {
			console.log('line1491', err);
		})
	;
}, 5 * 1000);

//30 sec interval
setInterval(function () {
	if (isSpawningAllowed) {
		dbSystemServiceController.serverActions('read', {enabled: true})
			.then(function (srvs) {
				_.forEach(srvs, function (srv) {
					var curServerName = _.get(srv, '_id');
					jtacController.aliveJtac30SecCheck(curServerName);
				});
			})
			.catch(function (err) {
				console.log('line1486', err);
			})
		;
	}
}, 30 * 1000);

/*
	dbMapServiceController.processActions('save', 'TrueDynamicCaucasus', {firingTime: new Date().getTime() + 5000, queObj: { blah: 1, blah2: 4 }})
		.then(function (runQues) {
			// process scheduled events
			// console.log('rq1: ', runQues);
		})
		.catch(function (err) {
			console.log('line1486', err);
		})
	;
*/
// process runner from scheduled processes
setInterval(function () {
	dbSystemServiceController.serverActions('read', {enabled: true})
		.then(function (srvs) {
			_.forEach(srvs, function (srv) {
				var curServerName = _.get(srv, '_id');
				_.set(curServers, [curServerName, 'details'], srv);
				dbMapServiceController.processActions('processExpired', _.get(srv, '_id'))
					.then(function (runQues) {
						// process scheduled events
						// console.log('rq2: ', runQues);
					})
					.catch(function (err) {
						console.log('line1486', err);
					})
				;
			});
		})
		.catch(function (err) {
			console.log('line1491', err);
		})
	;
}, 1000);

//emit payload, every sec to start
setInterval(function () { //sending FULL SPEED AHEAD, 1 per milsec (watch for weird errors, etc)
	dbSystemServiceController.serverActions('read')
		.then(function (resp) {
			_.forEach(resp, function (server) {
				if (server.enabled) {
					_.forEach(socketQues, function (que) {
						if (curServers[server.name]) {
							var sendAmt = 0;
							var curQue = _.get(curServers, [server.name, 'updateQue', que],[]);
							if (curQue.length < config.perSendMax) {
								sendAmt = curQue.length;
							} else {
								sendAmt = config.perSendMax
							}
							//console.log('message send, sending: ', sendAmt);
							var chkPayload = {que: []};
							for (x = 0; x < sendAmt; x++) {
								chkPayload.que.push(_.get(curQue, 0));
								_.set(chkPayload, 'name', server.name);
								curQue.shift();
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
					if (_.has(curServers, server.name) && curServers[server.name].DCSSocket) {
						if (curServers[server.name].DCSSocket.clientConnOpen) {
							curServers[server.name].DCSSocket.connectClient();
							epocToPayAttention = new Date().getTime() + epocTimeout;
							isSpawningAllowed = false;
							isBaseFullyPopped = false;
							isBasePop = false;
						}
						if (curServers[server.name].DCSSocket.gameGUIConnOpen) {
							curServers[server.name].DCSSocket.connectServer();
						}
					} else {
						_.set(curServers, [server.name, 'serverObject'], {
							units: [],
							airbases: [],
							players: []
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
}, 1 * 1 * 3000);

function syncDCSData(serverName, DCSData) {
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
