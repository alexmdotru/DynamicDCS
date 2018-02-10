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
		systemHost: '192.168.44.60',
		systemDatabase: 'DynamicDCS',
		dynamicHost: '192.168.44.60',
		dynamicDatabase: 'DDCSMaps'
	},
	perSendMax: 500,
	serverAdminLvl: 10,
	socketQue: {}
});

//main server ip
server = app.listen(DDCS.port);

//Controllers
const dbSystemServiceController = require('./controllers/db/dbSystemService');
const dbMapServiceController = require('./controllers/db/dbMapService');
dbSystemServiceController.connectSystemDB(DDCS.db.systemHost, DDCS.db.systemDatabase);
dbMapServiceController.connectMapDB(DDCS.db.dynamicHost, DDCS.db.dynamicDatabase);

//secure sockets
var io = require('socket.io').listen(server);
var admin = false;

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
		dbMapServiceController.statSessionActions('readLatest', req.params.serverName)
			.then(function(sesResp) {
				dbMapServiceController.srvPlayerActions('read', req.params.serverName, {sessionName: sesResp.name})
					.then(function (resp) {
						res.json(resp);
					})
					.catch(function (err) {
						console.log('line87: ', err);
					})
				;
			})
			.catch(function (err) {
				console.log('line92: ', err);
			})
		;
	});
router.route('/theaters')
	.get(function (req, res) {
		dbSystemServiceController.theaterActions('read')
			.then(function (resp) {
				res.json(resp);
			})
		;
	});
router.route('/servers')
	.get(function (req, res) {
		dbSystemServiceController.serverActions('read')
			.then(function (resp) {
				res.json(resp);
			})
		;
	});
router.route('/servers/:serverName')
	.get(function (req, res) {
		_.set(req, 'body.server_name', req.params.serverName);
		dbSystemServiceController.serverActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			})
		;
	});
router.route('/userAccounts')
	.get(function (req, res) {
		dbSystemServiceController.userAccountActions('read')
			.then(function (resp) {
				res.json(resp);
			})
		;
	});
router.route('/userAccounts/:_id')
	.get(function (req, res) {
		_.set(req, 'body.ucid', req.params._id);
		dbSystemServiceController.userAccountActions('read', req.body)
			.then(function (resp) {
				res.json(resp);
			})
		;
	});
router.route('/checkUserAccount')
	.post(function (req, res) {
		dbSystemServiceController.userAccountActions('checkAccount', req)
			.then(function (resp) {
				res.json(resp);
			})
		;
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
			})
		;
	});

router.route('/unitStatics/:serverName')
	.get(function (req, res) {
		var serverName = req.params.serverName;
		var clientIP = _.replace(req.connection.remoteAddress, '::ffff:', '');
		srvPlayerObj = {ipaddr: new RegExp(clientIP)};
		dbMapServiceController.srvPlayerActions('read', serverName, srvPlayerObj)
			.then(function (srvPlayer) {
				var curSrvPlayer = _.get(srvPlayer, 0);
				if (curSrvPlayer) {
					dbSystemServiceController.userAccountActions('read', {ucid: curSrvPlayer._id})
						.then(function (userAcct) {
							var curAcct = _.get(userAcct, 0);
							if (curAcct) {
								dbSystemServiceController.userAccountActions('updateSingleUCID', {ucid: curSrvPlayer._id, lastServer: serverName, gameName: curSrvPlayer.name})
									.then(function () {
										var unitObj = {
											dead: false,
											coalition: 0
										};
										if (curAcct.permLvl <= DDCS.serverAdminLvl) {
											delete unitObj.coalition;
										} else {
											_.set(unitObj, 'coalition', _.get(curSrvPlayer, 'side', 0));
										}
										dbMapServiceController.unitActions('readStd', serverName, unitObj)
											.then(function (resp) {
												res.json(resp);
											})
											.catch(function (err) {
												console.log('line184: ', err);
											})
										;
									})
									.catch(function (err) {
										console.log('line211: ', err);
									})
								;
							} else {
								var curSrvIP = _.first(_.split(curSrvPlayer.ipaddr, ':'));
								console.log('Cur Account Doesnt Exist line, matching IP: ', curSrvIP);
								dbSystemServiceController.userAccountActions('updateSingleIP', {ipaddr: curSrvIP, ucid: curSrvPlayer.ucid, lastServer: serverName, gameName: curSrvPlayer.name})
									.then(function () {
										dbSystemServiceController.userAccountActions('read', {ucid: curSrvPlayer.ucid})
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
														_.set(unitObj, 'coalition', _.get(curSrvPlayer, 'side', 0));
													}
													dbMapServiceController.unitActions('readStd', serverName, unitObj)
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
													_.set(unitObj, 'coalition', _.get(curSrvPlayer, 'side', 0));
													dbMapServiceController.unitActions('readStd', serverName, unitObj)
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
				console.log('line279: ', err);
			})
		;

	})
;

router.route('/bases/:serverName')
	.get(function (req, res) {
		dbMapServiceController.baseActions('getBaseSides', req.params.serverName)
			.then(function (bases) {
				res.json(bases);
			})
			.catch(function (err) {
				console.log('line210: ', err);
			})
		;

	})
;

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
			})
		;
	});
protectedRouter.route('/servers/:server_name')
	.put(function (req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		dbSystemServiceController.serverActions('update', req.body)
			.then(function (resp) {
				res.json(resp);
			})
		;
	})
	.delete(function (req, res) {
		_.set(req, 'body.name', req.params.server_name);
		dbSystemServiceController.serverActions('delete', req.body)
			.then(function (resp) {
				res.json(resp);
			})
		;
	});

protectedRouter.route('/userAccounts')
	.post(function (req, res) {
		dbSystemServiceController.userAccountActions('create', req.body)
			.then(function (resp) {
				res.json(resp);
			})
		;
	})
;
/*
srvPlayerObj = {ipaddr: new RegExp(_.replace(req.connection.remoteAddress, '::ffff:', ''))};
if(req.connection.remoteAddress === '::ffff:127.0.0.1') {
	srvPlayerObj = {_id: 'd124b99273260cf876203cb63e3d7791'};
}
*/

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
			dbSystemServiceController.userAccountActions('updateSocket', {
				authId: authId,
				curSocket: socket.id,
				lastIp: curIP
			})
				.then(function (curAcct) {
					if (curAcct) {
						if (curServerName) {
							dbMapServiceController.srvPlayerActions('read', curServerName, {_id: curAcct.ucid})
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
			dbMapServiceController.srvPlayerActions('read', curServerName, srvPlayerObj)
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
var i = 0;
setInterval(function () {
	var webPay = {
		payload: {derp: 'haha'+ i},
		serverName: 'dynamiccaucasus',
		side: 3
	};
	dbMapServiceController.webPushActions('save', 'dynamiccaucasus', webPay)
		.then(function () {

		})
		.catch(function (err) {
			console.log('line274: ', err);
		})
	;
	i++;
}, 100);
*/

setInterval(function () {
	dbSystemServiceController.serverActions('read', {enabled: true})
		.then(function (srvs) {
			_.forEach(srvs, function (srv) {
				var curServerName = _.toLower(_.get(srv, '_id'));
				dbMapServiceController.webPushActions('grabNextQue', curServerName)
					.then(function (webPush) {
						if (webPush) {
							var rName = webPush.serverName + '_' + webPush.side;
							_.set(DDCS, ['socketQue', rName], _.get(DDCS, ['socketQue', rName], []));
							_.get(DDCS, ['socketQue', rName]).push(webPush.payload);
						}
					})
					.catch(function (err) {
						console.log('line273: ', err);
					})
				;
			})
		})
		.catch(function (err) {
			console.log('line273: ', err);
		})
	;
}, 1);


setInterval(function () {
	_.forEach(DDCS.socketQue, function (sQue, sKey) {
		var sendArray = [];
		for(x=0; x < DDCS.perSendMax; x++) {
			if (sQue[x]) {
				sendArray.push(sQue[x]);
				sQue.shift();
			}
		}
		io.to(sKey).emit('srvUpd', sendArray);
	});
}, 500);
