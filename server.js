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
	_ = require('lodash');
require('dotenv').config();
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
	throw 'Make sure you have AUTH0_DOMAIN, and AUTH0_AUDIENCE in your .env file'
}
var DDCS = {};
//config
_.assign(DDCS, {
	port: 80,
	db: {
		systemHost: '127.0.0.1',
		systemDatabase: 'DDCS',
		dynamicHost: '192.168.44.60',
		dynamicDatabase: 'DDCSStandard',
		remoteHost: '127.0.0.1',
	},
	perSendMax: 200,
	serverAdminLvl: 10,
	socketQue: {}
});
//main server ip
server = app.listen(DDCS.port);
//Controllers
const discordBotController = require('./controllers/discordBot/discordBot');
const serverStatusController =  require('./controllers/serverStatus/serverStatus');
const masterDBController = require('./controllers/db/masterDB');
masterDBController.initDB('DDCS');

//secure sockets
var io = require('socket.io').listen(server);
var admin = false;
var webPushDone = true;
var webDbEmpty = false;
var srvPlayerObj;
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
app.use('/shh', express.static(__dirname + '/shh'));
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
router.route('/srvPlayers/:serverName')
	.get(function (req, res) {
		masterDBController.statSessionActions('readLatest', req.params.serverName)
			.then(function(sesResp) {
				masterDBController.srvPlayerActions('read', req.params.serverName, {sessionName: sesResp.name})
					.then(function (resp) {
						res.json(resp);
					})
					.catch(function (err) {
						console.log('line87: ', err);
						res.status(404);
						res.send(err);
					})
				;
			})
			.catch(function (err) {
				var mesg = 'line96: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/theaters')
	.get(function (req, res) {
		masterDBController.theaterActions('read')
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line111: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/servers')
	.get(function (req, res) {
		masterDBController.serverActions('read')
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line126: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/servers/:serverName')
	.get(function (req, res) {
		_.set(req, 'body.server_name', req.params.serverName);
		masterDBController.serverActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line142: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/userAccounts')
	.get(function (req, res) {
		masterDBController.userAccountActions('read')
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line157: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/userAccounts/:_id')
	.get(function (req, res) {
		_.set(req, 'body.ucid', req.params._id);
		masterDBController.userAccountActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line73: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/checkUserAccount')
	.post(function (req, res) {
		masterDBController.userAccountActions('checkAccount', req)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line188: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/srvEvents/:serverName')
	.get(function (req, res) {
		_.set(req, 'body.serverName', req.params.serverName);
		masterDBController.statSessionActions('readLatest', req.body.serverName, req.body)
			.then(function(sesResp) {
				_.set(req, 'body.sessionName', _.get(sesResp, 'name'));
				masterDBController.simpleStatEventActions('read', req.body.serverName, req.body)
					.then(function (resp) {
						res.json(resp);
					})
				;
			})
			.catch(function (err) {
				var mesg = 'line209: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/srvEvents/:serverName/:sessionName')
	.get(function (req, res) {
		_.set(req, 'body.serverName', req.params.serverName);
		_.set(req, 'body.sessionName', req.params.sessionName);
		masterDBController.simpleStatEventActions('read', req.body.serverName, req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line226: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;

router.route('/unitStatics/:serverName')
	.get(function (req, res) {
		var serverName = req.params.serverName;
		var clientIP = _.replace(req.connection.remoteAddress, '::ffff:', '');
		if (clientIP === '::1') {
			srvPlayerObj = {_id: 'd124b99273260cf876203cb63e3d7791'};
		} else {
			srvPlayerObj = {ipaddr: new RegExp(clientIP)};
		}
		masterDBController.serverActions('read', {_id: serverName})
			.then(function (serverConfig) {
				if (serverConfig.canSeeUnits) {
					masterDBController.srvPlayerActions('read', serverName, srvPlayerObj)
						.then(function (srvPlayer) {
							var curSrvPlayer = _.get(srvPlayer, 0);
							// console.log('CSP: ', curSrvPlayer);
							if (curSrvPlayer) {
								masterDBController.userAccountActions('read', {ucid: curSrvPlayer._id})
									.then(function (userAcct) {
										var curAcct = _.get(userAcct, 0);
										if (curAcct) {
											masterDBController.userAccountActions('updateSingleUCID', {ucid: curSrvPlayer._id, lastServer: serverName, gameName: curSrvPlayer.name})
												.then(function () {
													var curSlot = _.get(curSrvPlayer, 'slot', '');
													if(_.includes(curSlot, 'forward_observer') || _.includes(curSlot, 'artillery_commander') || curSlot === '') {
														var unitObj = {
															dead: false,
															coalition: 0
														};
														if (curAcct.permLvl <= DDCS.serverAdminLvl) {
															delete unitObj.coalition;
														} else {
															_.set(unitObj, 'coalition', _.get(curSrvPlayer, 'sideLock', 0));
														}
														masterDBController.unitActions('readMin', serverName, unitObj)
															.then(function (resp) {
																res.json(resp);
															})
															.catch(function (err) {
																console.log('line184: ', err);
															})
														;
													} else {
														res.json([]);
													}
												})
												.catch(function (err) {
													console.log('line211: ', err);
												})
											;
										} else {
											var curSrvIP = _.first(_.split(curSrvPlayer.ipaddr, ':'));
											// console.log('Cur Account Doesnt Exist line, matching IP: ', curSrvIP);
											masterDBController.userAccountActions('updateSingleIP', {ipaddr: curSrvIP, ucid: curSrvPlayer.ucid, lastServer: serverName, gameName: curSrvPlayer.name})
												.then(function () {
													res.json([]);
													/*
                                                    masterDBController.userAccountActions('read', {ucid: curSrvPlayer.ucid})
                                                        .then(function (userAcct) {
                                                            var unitObj;
                                                            var curAcct = _.get(userAcct, 0);
                                                            if (curAcct) {
                                                                unitObj = {
                                                                    dead: false,
                                                                    coalition: 0
                                                                };
                                                                if (curAcct.permLvl <= DDCS.serverAdminLvl) {
                                                                    delete unitObj.coalition;
                                                                } else {
                                                                    _.set(unitObj, 'coalition', _.get(curSrvPlayer, 'sideLock', 0));
                                                                }
                                                                masterDBController.unitActions('readStd', serverName, unitObj)
                                                                    .then(function (resp) {
                                                                        res.json(resp);
                                                                    })
                                                                    .catch(function (err) {
                                                                        console.log('line238: ', err);
                                                                    })
                                                                ;
                                                            } else {
                                                                console.log('go by pure IP');
                                                                unitObj = {
                                                                    dead: false,
                                                                    coalition: 0
                                                                };
                                                                _.set(unitObj, 'coalition', _.get(curSrvPlayer, 'sideLock', 0));
                                                                masterDBController.unitActions('readStd', serverName, unitObj)
                                                                    .then(function (resp) {
                                                                        res.json(resp);
                                                                    })
                                                                    .catch(function (err) {
                                                                        console.log('line253: ', err);
                                                                    })
                                                                ;
                                                            }
                                                        })
                                                        .catch(function (err) {
                                                            console.log('line259: ', err);
                                                        })
                                                    ;
                                                    */
												})
												.catch(function (err) {
													console.log('line264: ', err);
												})
											;
										}
									})
									.catch(function (err) {
										console.log('line270: ', err);
									})
								;
							} else {
								var mesg = clientIP + ' Has never played on the server';
								console.log(mesg);
								res.status(404);
								res.send(mesg);
							}
						})
						.catch(function (err) {
							var mesg = 'line350: ' + err;
							console.log(mesg);
							res.status(404);
							res.send(mesg);
						})
					;
				} else {
					var mesg = 'line357: canSeeUnits False';
					console.log(mesg);
					res.status(404);
					res.send(mesg);
				}
			})
			.catch(function (err) {
				var mesg = 'line364: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
router.route('/bases/:serverName')
	.get(function (req, res) {
		var curServerName = _.get(req, 'params.serverName');
		masterDBController.baseActions('getBaseSides', _.get(req, 'params.serverName'))
			.then(function (bases) {
				res.json(bases);
			})
			.catch(function (err) {
				var mesg = 'line369: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
//start of protected endpoints, must have auth token
protectedRouter.use(checkJwt);
//past this point must have permission value less than 10
protectedRouter.use(function (req, res, next) {
	masterDBController.userAccountActions('getPerm', req.user.sub)
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
		masterDBController.serverActions('create', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line414: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	});
protectedRouter.route('/servers/:server_name')
	.put(function (req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		masterDBController.serverActions('update', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line429: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
	.delete(function (req, res) {
		_.set(req, 'body.name', req.params.server_name);
		masterDBController.serverActions('delete', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line443: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	});

protectedRouter.route('/userAccounts')
	.post(function (req, res) {
		masterDBController.userAccountActions('create', req.body)
			.then(function (resp) {
				res.json(resp);
			})
			.catch(function (err) {
				var mesg = 'line458: ' + err;
				console.log(mesg);
				res.status(404);
				res.send(mesg);
			})
		;
	})
;
_.set(DDCS, 'setSocketRoom', function setSocketRoom(socket, room) {
	console.log('Joining Room: ', socket.id, room);
	if (_.get(socket, 'room')) {
		socket.leave(socket.room);
	}
	_.set(socket, 'room', room);
	socket.join(room);
});
io.on('connection', function (socket) {

	socket.on('room', function (rObj) {
		var curServerName = _.toLower(rObj.server);
		var curIP = socket.conn.remoteAddress.replace("::ffff:", "");
		var authId = socket.handshake.query.authId;

		console.log(socket.id + ' connected on ' + curIP + ' with ID: ' + authId);
		if (authId !== 'null') {
			console.log('LOGGED IN', authId);
			masterDBController.userAccountActions('updateSocket', {
				authId: authId,
				curSocket: socket.id,
				lastIp: curIP
			})
				.then(function (curAcct) {
					if (curAcct) {
						if (curServerName) {
							masterDBController.srvPlayerActions('read', curServerName, {_id: curAcct.ucid})
								.then(function (srvPlayer) {
									var side;
									var curSrvPlayer = _.get(srvPlayer, 0);
									if (curAcct.permLvl <= DDCS.serverAdminLvl) {
										side = 3;
									} else {
										side = _.get(curSrvPlayer, 'side', 0);
									}

									DDCS.setSocketRoom(socket, curServerName + '_' + side);
								})
								.catch(function (err) {
									console.log('line210: ', err);
								})
							;
						} else {
							console.log('No serverName for ' + curAcct);
						}
					} else {
						console.log('no account in DB for ' + authId);
					}
				})
				.catch(function (err) {
					console.log('line339', err);
				})
			;
		} else {
			console.log('NOT LOGGED IN');
			srvPlayerObj = {ipaddr: new RegExp(curIP)};
			masterDBController.srvPlayerActions('read', curServerName, srvPlayerObj)
				.then(function (srvPlayer) {
					var curSrvPlayer = _.get(srvPlayer, 0);
					if (curSrvPlayer) {
						DDCS.setSocketRoom(socket, curServerName + '_' + _.get(curSrvPlayer, 'side', 0));
					}
				})
				.catch(function (err) {
					console.log('line423: ', err);
				})
			;
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
});
/*
setInterval(function () {
	if (webPushDone) {
		webPushDone = false;
		webDbEmpty = false;
		masterDBController.serverActions('read', {enabled: true})
			.then(function (srvs) {
				_.forEach(srvs, function (srv) {
					var curServerName = _.toLower(_.get(srv, '_id'));
					var lookupFinish = [];
					for(x=0; (x < DDCS.perSendMax) || webDbEmpty; x++) {
						lookupFinish.push(masterDBController.masterQueActions('grabNextQue', curServerName)
							.then(function (webPush) {
								if (webPush) {
									var rName = webPush.serverName + '_' + webPush.side;
									_.set(webPush, 'payload.recId', _.get(webPush, '_id', 0));
									_.set(DDCS, ['socketQue', rName], _.get(DDCS, ['socketQue', rName], []));
									_.get(DDCS, ['socketQue', rName]).push(webPush.payload);
								} else {
									webDbEmpty = true
								}
							})
							.catch(function (err) {
								console.log('line273: ', err);
							}))
						;
					}
					Promise.all(lookupFinish)
						.then(function () {
							_.forEach(DDCS.socketQue, function (sQue, sKey) {
								io.to(sKey).emit('srvUpd', _.orderBy(sQue, ['recId']));
							});
							_.set(DDCS, 'socketQue', {});
							webPushDone = true;
						})
						.catch(function (err) {
							console.log('line510: ', err);
						})
					;
				})
			})
			.catch(function (err) {
				console.log('line520: ', err);
			})
		;
	}
}, 200);

*/
