const express = require('express'),
	app = express(),
	jwt = require('express-jwt'),
	jwtAuthz = require('express-jwt-authz'),
	jwksRsa = require('jwks-rsa'),
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

// Start the server
var server;
var serverAddress;
if (process.env.NODE_ENV !== config.test_env) { //SET NODE_ENV=test
	server = app.listen(config.port);
	serverAddress = config.dcs_socket;
	console.log(`Your server is running on port ${config.port}.`);
} else{
	server = app.listen(config.test_port);
	serverAddress = config.test_dcs_socket;
}
var io  = require('socket.io').listen(server);

//Controllers
const dbSystemServiceController = require('./controllers/dbSystemService');
const dbMapServiceController = require('./controllers/dbMapService');
const DCSSocket = require('./controllers/DCSSocket');

var admin = false;

// app.use/routes/etc...
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
		jwksUri: 'https://'+process.env.AUTH0_DOMAIN+'/.well-known/jwks.json'
	}),
	// Validate the audience and the issuer.
	audience: process.env.AUTH0_AUDIENCE,
	issuer: 'https://'+process.env.AUTH0_DOMAIN+'/',
	algorithms: ['RS256']
});

router.route('/theaters')
	.get(function(req, res) {
		dbSystemServiceController.theaterActions('read')
			.then(function (resp){
				res.json(resp);
			});
	});
router.route('/servers')
	.get(function(req, res) {
		dbSystemServiceController.serverActions('read')
			.then(function (resp){
				res.json(resp);
			});
	});
router.route('/servers/:server_name')
	.get(function(req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		dbSystemServiceController.serverActions('read', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});
router.route('/userAccounts')
	.get(function(req, res) {
		dbSystemServiceController.userAccountActions('read')
			.then(function (resp){
				res.json(resp);
			});
	});
router.route('/userAccounts/:_id')
	.get(function(req, res) {
		_.set(req, 'body._id', req.params._id);
		dbSystemServiceController.userAccountActions('read', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});

//start of protected endpoints
protectedRouter.use(checkJwt);
protectedRouter.use(function (req, res, next) {
	dbSystemServiceController.userAccountActions('getPerm', req.user.sub)
		.then(function (resp){
			//console.log('permlvl: ',resp[0].permLvl, resp);
			if( resp[0].permLvl > 10 ){
				res.status('503').json({ message: "You dont have permissions to do requested action." });
			} else {}
			next();
		})
	;
});

protectedRouter.route('/servers')
	.post(function(req, res) {
		dbSystemServiceController.serverActions('create', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});
protectedRouter.route('/servers/:server_name')
	.put(function(req, res) {
		_.set(req, 'body.server_name', req.params.server_name);
		dbSystemServiceController.serverActions('update', req.body)
			.then(function (resp){
				res.json(resp);
			});
	})
	.delete(function(req, res) {
		_.set(req, 'body.name', req.params.server_name);
		dbSystemServiceController.serverActions('delete', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});

protectedRouter.route('/userAccounts')
	.post(function(req, res) {
		console.log(req.user.sub);
		dbSystemServiceController.userAccountActions('create', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});
protectedRouter.route('/userAccounts/:_id')
	.put(function(req, res) {
		_.set(req, 'body._id', req.params._id);
		dbSystemServiceController.userAccountActions('update', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});

protectedRouter.route('/checkUserAccount')
	.post(function(req, res) {
		dbSystemServiceController.userAccountActions('checkAccount', req)
			.then(function (resp){
				res.json(resp);
			});
	});

//setup globals
var outOfSyncUnitCnt = 0;
var socketQues = ['que1','que2','que0','queadmin'];
var curServers = {};
//var serverObject;
//var updateQue;



function initClear( serverName, serverType ) {
	if (serverType === 'client') {
		_.set(curServers, ['serverObject', serverName, 'units'], []);
		//Unit.collection.drop();
		dbMapServiceController.unitActions('dropall', serverName); //someday maps will persist, reset all units
		_.set(curServers, ['serverObject', serverName, 'ClientRequestArray'], []);
	}
	if (serverType === 'server') {
		_.set(curServers, ['serverObject', serverName, 'GameGUIRequestArray'], []);
	}
}

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

function initUnits (serverName, socketID) {
	console.log('sendINIT for ', serverName, ' for socket ', socketID);
	var initQue = {que: []};
	//var pSlot = _.get(_.find(serverObject.players, {'socketID': socketID}), 'slot', '');
	var pSide = _.get(_.find(curServers[serverName].serverObject.players, {'socketID': socketID}), 'side', 0);
	if (admin) {
		pSide = 'A';
	}
	var spectator = {
		action: 'spectator',
		data: {}
	};

	if (_.get(curServers, [serverName, 'serverObject', 'units'], []).length > 0 && pSide !== 0) {
		_.forEach(_.get(curServers, [serverName, 'serverObject', 'units'], []), function (unit) {
			if (_.get(unit, 'coalition') === pSide || pSide === 'A') {
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
	} else {
		io.to(socketID).emit('srvUpd', {que: [{action: 'reset'}]});
	}

	var sendAmt = 0;
	var totalChkLoops = _.ceil(initQue.que.length / config.perSendMax);
	//console.log(totalChkLoops);

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


//initArray Push
function sendInit(serverName, socketID) {

	if (socketID === 'all'){
		//problem, find out what sockets are on what server.....
		_.forEach(io.sockets.sockets, function ( socket ) {
			console.log('send init to all clients', socket.id);
			initUnits (serverName, socket.id);
		});
	}else {
		//console.log('server name: ', serverName, curServers);
		initUnits (serverName, socketID);
	}
}


//setup socket io
io.on('connection', function( socket ) {
	var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	clientIpAddress = clientIpAddress.replace(/^.*:/, '');

	var  sockInfo = {
		action: 'socketInfo',
		data: {
			id: socket.id,
			ip: clientIpAddress
		}
	};

	io.to(socket.id).emit('srvUpd', sockInfo);

	console.log(' new request from : ',clientIpAddress, sockInfo);
	//send socketid payload to client

	if (!io.sockets.adapter.sids[socket.id]['0']) {
		io.sockets.sockets[socket.id].join(0);
	}

	//client updates
	//console.log("Units: "+serverObject.units.length);
	socket.on('clientUpd', function (data) {
		if(data.action === 'unitINIT') {
			console.log(socket.id + ' is having unit desync, or initial INIT');
			var serverName = 'DynamicCaucasus'; // temp, this needs to go.
			if( curServers[serverName] ) {
				sendInit(serverName, socket.id);
			}
		}
	});

    socket.on('disconnect', function(){
        console.log(socket.id+' user disconnected');
    });
	socket.on('error', function(err) {
		if(err === 'handshake error') {
			console.log('handshake error', err);
		} else {
			console.log('io error', err);
		}
	});
});

_.set(curServers, 'processQue', function (serverName, update) {
	//console.log('process que: ', serverName, update);
	if (typeof update.unitCount !== 'undefined'){
		if(update.unitCount !== curServers[serverName].serverObject.units.length){
			console.log('out of sync for '+outOfSyncUnitCnt);
			if ( outOfSyncUnitCnt > config.outOfSyncUnitThreshold){
				outOfSyncUnitCnt = 0;
				console.log('reset server units');
				initClear( serverName, 'client' );
				_.get(curServers, [serverName, 'serverObject', 'ClientRequestArray']).push({"action":"INIT"});
				sendInit(serverName, 'all');
			}else{
				outOfSyncUnitCnt++;
			}
		}else{
			outOfSyncUnitCnt = 0;
		}
	}

	_.forEach(update.que, function (queObj) {
		//console.log(queObj);
		var curObj = {};
		var curUnit = _.find(curServers[serverName].serverObject.units, { 'unitID': _.get(queObj, 'data.unitID') });

		if (_.get(queObj, 'action') === 'C') {
			if (typeof curUnit !== "undefined") {
				curUnit.action = 'U';
			}else{
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
				curServers[serverName].updateQue['que'+parseFloat(_.get(queObj, 'data.coalition'))].push(_.cloneDeep(curObj));
				curServers[serverName].updateQue.queadmin.push(_.cloneDeep(curObj));
			}
		}
		if (_.get(queObj, 'action') === 'U') {
			if (typeof curUnit !== "undefined") {
				curUnit.lat = parseFloat(_.get(queObj, 'data.lat'));
				curUnit.lon =  parseFloat(_.get(queObj, 'data.lon'));
				curUnit.alt =  parseFloat(_.get(queObj, 'data.alt'));
				curUnit.hdg =  parseFloat(_.get(queObj, 'data.hdg'));
				curUnit.speed =  parseFloat(_.get(queObj, 'data.speed'));
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

				curServers[serverName].updateQue['que'+curUnit.coalition].push(_.cloneDeep(curObj));
				curServers[serverName].updateQue.queadmin.push(_.cloneDeep(curObj));
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
			_.remove(curServers[serverName].serverObject.units, { 'unitID': _.get(queObj, 'data.unitID') });
			curServers[serverName].updateQue['que1'].push(_.cloneDeep(curObj));
			curServers[serverName].updateQue['que2'].push(_.cloneDeep(curObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(curObj));
		}

		//playerUpdate
		if (_.get(queObj, 'action') === 'players') {
			curServers[serverName].serverObject.players = queObj.data;
			_.forEach(curServers[serverName].serverObject.players, function(player) {
				if (_.get(player, 'ipaddr')){
					var pArry = _.get(player, 'ipaddr').split(":");
					if(pArry[0] === '' ){
						_.set(player, 'socketID', _.get(_.find(_.get(io, 'sockets.sockets'), function (socket) {
							if(socket.conn.remoteAddress === '::ffff:127.0.0.1' || socket.conn.remoteAddress === '::1'){
								return true;
							}
							return false;
						}), 'id', ''));
						//console.log('1',pArry[0], player.socketID);
					}else{
						_.set(player, 'socketID', _.get(_.find(_.get(io, 'sockets.sockets'), function (socket) {
							//console.log(socket.conn.remoteAddress, '::ffff:'+pArry[0]);
							if(socket.conn.remoteAddress === '::ffff:'+pArry[0]){
								return true;
							}
							return false;
						}), 'id', ''));
						//console.log('2',pArry[0], player.socketID);
					}

					//rewrite this someday, sets up the socket.io information rooms for updates
					if(!_.isEmpty(player.socketID)) {
						if (admin) {
							//figure admins later
							if (io.sockets.adapter.sids[player.socketID]['1']) {
								io.sockets.sockets[player.socketID].leave(1);
							}
							if (io.sockets.adapter.sids[player.socketID]['2']) {
								io.sockets.sockets[player.socketID].leave(2);
							}
							if (io.sockets.adapter.sids[player.socketID]['0']) {
								io.sockets.sockets[player.socketID].leave(0);
							}
							if (!io.sockets.adapter.sids[player.socketID]['admin']) {
								console.log(player.name + ' socket is admin');
								io.sockets.sockets[player.socketID].join('admin');
								sendInit(serverName, player.socketID);
							}
						}else if (player.side === 0) {
							if (io.sockets.adapter.sids[player.socketID]['1']) {
								io.sockets.sockets[player.socketID].leave(1);
							}
							if (io.sockets.adapter.sids[player.socketID]['2']) {
								io.sockets.sockets[player.socketID].leave(2);
							}
							if (io.sockets.adapter.sids[player.socketID]['admin']) {
								io.sockets.sockets[player.socketID].leave('admin');
							}
							if (!io.sockets.adapter.sids[player.socketID]['0']) {
								console.log(player.name + ' is spectator');
								io.sockets.sockets[player.socketID].join(0);
								sendInit(serverName, player.socketID);
							}
						}else if (player.side === 1) {
							if (io.sockets.adapter.sids[player.socketID]['admin']) {
								io.sockets.sockets[player.socketID].leave('admin');
							}
							if (io.sockets.adapter.sids[player.socketID]['0']) {
								io.sockets.sockets[player.socketID].leave(0);
							}
							if (io.sockets.adapter.sids[player.socketID]['2']) {
								io.sockets.sockets[player.socketID].leave(2);
							}
							if (!io.sockets.adapter.sids[player.socketID]['1']) {
								io.sockets.sockets[player.socketID].join(1);
								sendInit(serverName, player.socketID);
								console.log(player.name + ' is player in slot, side 1');
							}
						}else if (player.side === 2) {
							if (io.sockets.adapter.sids[player.socketID]['admin']) {
								io.sockets.sockets[player.socketID].leave('admin');
							}
							if (io.sockets.adapter.sids[player.socketID]['0']) {
								io.sockets.sockets[player.socketID].leave(0);
							}
							if (io.sockets.adapter.sids[player.socketID]['1']) {
								io.sockets.sockets[player.socketID].leave(1);
							}
							if (!io.sockets.adapter.sids[player.socketID]['2']) {
								io.sockets.sockets[player.socketID].join(2);
								sendInit(serverName, player.socketID);
								console.log(player.name + ' is player in slot, side 2');
							}
						}
					}
				}
			});
			//apply local information object
			_.forEach(queObj.data, function ( data ){
				if(data) {
					if (data.ucid) {
						_.set(data, '_id', data.ucid);
						//update map based player table
						dbMapServiceController.srcPlayerActions('update', serverName, data);
						if(data.ipaddr === ':10308' || data.ipaddr === '::ffff:127.0.0.1'){
							data.ipaddr = '127.0.0.1';
						}
						//update user based table (based on ucid)
						var curActUpdate = {
							gameName: _.get(data, 'name', ''),
							lastIp: _.get(data, 'ipaddr', ''),
							curSocket: _.get(data, 'socketID', ''),
							ucid: _.get(data, 'ucid')
						};
						dbSystemServiceController.userAccountActions('update', serverName, curActUpdate);
					}
				}
			});

			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}

		//Base Info
		if (_.get(queObj, 'action') === 'baseInfo') {
			//var blah = 'Vaziani-West_FARP';
			//console.log('baseinfo: ', queObj, queObj.data[blah]);
			//send response straight to client id
			_.forEach(queObj.data, function (value, key){
				var curObj = {
					_id: key,
					name: key,
					coalition: value
				};
				dbMapServiceController.baseActions('update', serverName, curObj);
			});

			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}

		//Cmd Response
		if (_.get(queObj, 'action') === 'CMDRESPONSE') {
			//send response straight to client id
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}

		//mesg
		if (_.get(queObj, 'action') === 'MESG') {
			console.log(queObj);
			//console.log(serverObject.players);
			if(_.get(queObj, 'data.playerID') )
				if (_.isNumber(_.get(_.find(curServers[serverName].serverObject.players, { 'id': _.get(queObj, 'data.playerID') }), 'side', 0))) {
					curServers[serverName].updateQue['que'+_.get(_.find(curServers[serverName].serverObject.players, { 'id': _.get(queObj, 'data.playerID') }), 'side', 0)]
						.push(_.cloneDeep(queObj));
					curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
				}
		}

		//events
		if (_.get(queObj, 'action') === 'friendly_fire') {
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'mission_end') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'kill') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'self_kill') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'change_slot') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'connect') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'disconnect') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'crash') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'eject') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'takeoff') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'landing') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'pilot_death') {
			curServers[serverName].updateQue.que1.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que2.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.que0.push(_.cloneDeep(queObj));
			curServers[serverName].updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		return true;
	});
});


//emit payload, every sec to start
setInterval(function(){
	dbSystemServiceController.serverActions('read')
		.then(function (resp){
			_.forEach(resp, function (server) {
				if (server.enabled) {
					_.forEach(socketQues, function (que, key) {
						var sendAmt = 0;
						//console.log(updateQue[que].length);
						if (curServers[server.name].updateQue[que].length < config.perSendMax) {
							sendAmt = curServers[server.name].updateQue[que].length;
						}else{
							sendAmt = config.perSendMax
						}
						var chkPayload = {que:[]};
						for (x=0; x < sendAmt; x++ ) {
							chkPayload.que.push(curServers[server.name].updateQue[que][0]);
							curServers[server.name].updateQue[que].shift();
						}
						if (chkPayload.que.length){
							//io.to(key).emit('srvUpd', chkPayload);
						}
					});
				}
			});
		})
	;
}, 1 * 500);

//dcs socket engine connection handler
setInterval(function(){
	dbSystemServiceController.serverActions('read')
		.then(function (resp){
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
							que1: [],
							que2: [],
							que0: [],
							queadmin: []
						});
						curServers[server.name].DCSSocket = new DCSSocket(server.name, server.ip, server.dcsClientPort, server.dcsGameGuiPort, syncDCSData, io, initClear, curServers[server.name].serverObject.ClientRequestArray, curServers[server.name].serverObject.GameGUIRequestArray);
						//console.log('creating object: ', server.name, curServers[server.name]);
					}
				}
			});
		});
}, 1 * 1 * 1000);

function syncDCSData (serverName, DCSData) {
	//console.log('incoming data: ', DCSData);
	//var timetest = new Date();
	//_.set(serverObject, 'ClientRequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'trigger.action.outText("IT WORKS MOFO!", 2)'});
	//accept updates
	if (!_.isEmpty(DCSData.que)) {
		curServers.processQue(serverName, DCSData);
    }
}
