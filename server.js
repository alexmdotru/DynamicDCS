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

//start of protected endpoints, must have auth token
protectedRouter.use(checkJwt);
protectedRouter.route('/checkUserAccount')
	.post(function (req, res) {
		dbSystemServiceController.userAccountActions('checkAccount', req)
			.then(function (resp) {
				res.json(resp);
			});
	});

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
		//console.log(req.user.sub);
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

function initClear(serverName, serverType) {
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

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

function initUnits(serverName, socketID, authId) {
	//console.log('sendInitUNITS for ', serverName, ' for socket ', socketID);
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
function sendInit(serverName, socketID, authId) {

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


function setSocketRoom(socket, room) {
	if (socket.room) {
		console.log('leaving room: ', socket.room);
		socket.leave(socket.room);
	}
	socket.room = room;
	socket.join(room);
	console.log('socket.room: ', room);
}

function setRoomSide(socket, roomObj) {
	if (roomObj.server === 'leaderboard') {
		setSocketRoom(socket, 'leaderboard');
	} else {
		dbSystemServiceController.userAccountActions('read')
			.then(function (userAccounts) {
				var curAccount = _.find(userAccounts, {authId: roomObj.authId}); // might have to decrypt authtoken...
				if (typeof curAccount !== 'undefined') {
					dbMapServiceController.srvPlayerActions('read', roomObj.server)
						.then(function (srvPlayers) {
							pSide = _.find(srvPlayers, {ucid: curAccount.ucid}).side;
							//console.log('settingsock: ', socket.id+' side: ', pSide);
							if (curAccount.permLvl < 20) {
								setSocketRoom(socket, roomObj.server + '_qadmin');
							} else if (pSide === 1 || pSide === 2) {
								setSocketRoom(socket, roomObj.server + '_q' + pSide);
							}
						})
					;
				} else {
					console.log('no account detected, match with ip now');
					var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
					if (curIP === ':10308' || curIP ==='127.0.0.1') {
						curIP = '192.168.44.148';
					}
					dbMapServiceController.srvPlayerActions('read', roomObj.server)
						.then(function (srvPlayers) {
							var curPlayer = _.find(srvPlayers, function (player) { //{ipaddr: curIP}
								console.log('ipcomp: ', player.ipaddr, curIP );
								if (_.includes(player.ipaddr, curIP)) {
									return true;
								}
								return false;
							});
							if( curPlayer ) {
								setSocketRoom(socket, roomObj.server + '_q' + curPlayer.side);
								nonaccountUsers[curPlayer.ucid] = {
									curSocket: socket.id
								};
							}
						})
					;
				}
			})
		;
	}
}

//setup socket io
io.on('connection', function (socket) {
	var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
	if (curIP === ':10308' || curIP ==='127.0.0.1') {
		curIP = '192.168.44.148';
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
		dbSystemServiceController.userAccountActions('update', {
			authId: socket.handshake.query.authId,
			curSocket: socket.id,
			lastIp: curIP
		})
			.then(function (data) {
				//console.log('update data resp: ', data);
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
		;
	}
});

_.set(curServers, 'processQue', function (serverName, update) {
	//console.log('process que: ', serverName, update);
	if (typeof update.unitCount !== 'undefined') {
		if (update.unitCount !== curServers[serverName].serverObject.units.length) {
			console.log('out of sync for ' + outOfSyncUnitCnt);
			if (outOfSyncUnitCnt > config.outOfSyncUnitThreshold) {
				outOfSyncUnitCnt = 0;
				console.log('reset server units');
				initClear(serverName, 'client');
				_.get(curServers, [serverName, 'serverObject', 'ClientRequestArray']).push({"action": "INIT"});
				sendInit(serverName, 'all');
			} else {
				outOfSyncUnitCnt++;
			}
		} else {
			outOfSyncUnitCnt = 0;
		}
	}

	_.forEach(update.que, function (queObj) {
		//console.log(queObj);
		var curObj = {};
		var curUnit = _.find(curServers[serverName].serverObject.units, {'unitID': _.get(queObj, 'data.unitID')});

		if (_.get(queObj, 'action') === 'C') {
			if (typeof curUnit !== "undefined") {
				curUnit.action = 'U';
			} else {
				curObj = {
					action: 'C',
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
			if (typeof curUnit !== "undefined") {
				curUnit.lat = parseFloat(_.get(queObj, 'data.lat'));
				curUnit.lon = parseFloat(_.get(queObj, 'data.lon'));
				curUnit.alt = parseFloat(_.get(queObj, 'data.alt'));
				curUnit.hdg = parseFloat(_.get(queObj, 'data.hdg'));
				curUnit.speed = parseFloat(_.get(queObj, 'data.speed'));
				curObj = {
					action: 'U',
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
			var switchedPlayer;
			_.forEach(queObj.data, function (player) {
				if (player !== null) {
			//console.log('playerupd: ', player);

					var matchPlayer = _.find(curServers[serverName].serverObject.players, {ucid: player.ucid});
					if ((matchPlayer && matchPlayer.side !== player.side) && player.side !== 0) {
					dbSystemServiceController.userAccountActions('read')
						.then(function (resp) {
							switchedPlayer = nonaccountUsers[player.ucid];
							if(typeof switchedPlayer === 'undefined') {
								switchedPlayer = _.find(resp, {ucid: player.ucid});
							}
							if (typeof switchedPlayer !== 'undefined' &&switchedPlayer.permLvl < 20) {
								setSocketRoom(io.sockets.connected[switchedPlayer.curSocket], serverName + '_padmin');
							} else if (player.side === 1 || player.side === 2) {
								setSocketRoom(io.sockets.connected[switchedPlayer.curSocket], serverName + '_q' + player.side);
							} else {
								//setSocketRoom (io.sockets.connected[switchedPlayer.curSocket], serverName+'_q0');
							}
						})
					;
					}
				}

			});
			//
			//console.log(curServers[serverName].serverObject.players);
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
						if (data.ipaddr === ':10308' || data.ipaddr === ':127.0.0.1') {
							data.ipaddr = '192.168.44.148';
						}
						//update user based table (based on ucid)
						//console.log('playerstime: ', data);
						//console.log('playerinc: ', data);
						var curActUpdate = {
							playerId: _.get(data, 'id', ''),
							ucid: _.get(data, 'ucid', ''),
							gameName: _.get(data, 'name', ''),
							lastIp: _.get(data, 'ipaddr', ''),
							side: _.get(data, 'side', '')
						};

						if (curActUpdate.ucid !== '') {
							dbSystemServiceController.userAccountActions('update', curActUpdate);
						}
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
			//var blah = 'Vaziani-West_FARP';
			//console.log('baseinfo: ', queObj, queObj.data[blah]);
			//send response straight to client id
			_.forEach(queObj.data, function (value, key) {
				var curObj = {
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
			//send response straight to client id
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}

		//mesg
		if (_.get(queObj, 'action') === 'MESG') {
			console.log(queObj);
			//console.log(serverObject.players);
			if (_.get(queObj, 'data.playerID'))
				if (_.isNumber(_.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0))) {
					curServers[serverName].updateQue['q' + _.get(_.find(curServers[serverName].serverObject.players, {'id': _.get(queObj, 'data.playerID')}), 'side', 0)]
						.push(_.cloneDeep(queObj));
					curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
				}
		}

		//events
		if (_.get(queObj, 'action') === 'friendly_fire') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'mission_end') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'kill') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'self_kill') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'change_slot') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'connect') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'disconnect') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'crash') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'eject') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'takeoff') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'landing') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'pilot_death') {
			curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
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
						if (typeof curServers[server.name] !== 'undefined') {
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
	;
}, 35);

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
						curServers[server.name].DCSSocket = new DCSSocket(server.name, server.ip, server.dcsClientPort, server.dcsGameGuiPort, syncDCSData, io, initClear, curServers[server.name].serverObject.ClientRequestArray, curServers[server.name].serverObject.GameGUIRequestArray);
						//console.log('creating object: ', server.name, curServers[server.name]);
					}
				}
			});
		});
}, 1 * 1 * 1000);

function syncDCSData(serverName, DCSData) {
	//console.log('incoming data: ', DCSData);
	//var timetest = new Date();
	//_.set(serverObject, 'ClientRequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'trigger.action.outText("IT WORKS MOFO!", 2)'});
	//accept updates
	if (!_.isEmpty(DCSData.que)) {
		curServers.processQue(serverName, DCSData);
	}
}
