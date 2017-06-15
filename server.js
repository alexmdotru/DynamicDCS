

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
router.route('/userAccounts/:userAccount')
	.get(function(req, res) {
		_.set(req, 'body.userAccount', req.params.userAccount);
		dbSystemServiceController.userAccountActions('read', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});

//start of protected endpoints
protectedRouter.use(checkJwt);
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
		dbSystemServiceController.userAccountActions('create', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});
protectedRouter.route('/userAccounts/:userAccount')
	.put(function(req, res) {
		_.set(req, 'body.userAccount', req.params.userAccount);
		dbSystemServiceController.userAccountActions('update', req.body)
			.then(function (resp){
				res.json(resp);
			});
	});



//setup globals
var outOfSyncUnitCnt = 0;

var serverObject = {
	units: [],
	bases: [],
	players: [],
	ClientRequestArray: [],
	GameGUIRequestArray: []
};

var updateQue = {
	que1: [],
	que2: [],
	que0: [],
	queadmin: []
};

function initClear( serverType ) {
	if (serverType === 'client') {
		_.set(serverObject, 'units', []);
		//Unit.collection.drop();
		dbMapServiceController.unitActions('dropall'); //someday maps will persist, reset all units
		_.set(serverObject, 'ClientRequestArray', []);
	}
	if (serverType === 'server') {
		_.set(serverObject, 'GameGUIRequestArray', []);
	}
}

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}


function initUnits ( socketID ) {
	console.log('sendINIT',socketID);
	var initQue = {que: []};
	//var pSlot = _.get(_.find(serverObject.players, {'socketID': socketID}), 'slot', '');
	var pSide = _.get(_.find(serverObject.players, {'socketID': socketID}), 'side', 0);
	if (admin) {
		pSide = 'A';
	}
	var spectator = {
		action: 'spectator',
		data: {}
	};

	if (_.get(serverObject, 'units', []).length > 0 && pSide !== 0) {
		_.forEach(_.get(serverObject, 'units', []), function (unit) {
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
function sendInit(socketID) {

	if (socketID === 'all'){
		_.forEach(io.sockets.sockets, function ( socket ) {
			console.log('send init to all clients', socket.id);
			initUnits ( socket.id );
		});
	}else {
		initUnits ( socketID );
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
	console.log("Units: "+serverObject.units.length);
	socket.on('clientUpd', function (data) {
		if(data.action === 'unitINIT') {
			console.log(socket.id + ' is having unit desync, or initial INIT');
			sendInit(socket.id);
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

console.log(':: SERVER IS RUNNING!');

_.set(serverObject, 'parse', function (update) {

	if (typeof update.unitCount !== 'undefined'){
		if(update.unitCount !== serverObject.units.length){
			console.log('out of sync for '+outOfSyncUnitCnt);
			if ( outOfSyncUnitCnt > config.outOfSyncUnitThreshold){
				outOfSyncUnitCnt = 0;
				console.log('reset server units');
				initClear( 'client' );
				_.get(serverObject, 'ClientRequestArray').push({"action":"INIT"});
				sendInit( 'all' );
			}else{
				outOfSyncUnitCnt++;
			}
		}else{
			outOfSyncUnitCnt = 0;
		}
	}

	_.forEach(update.que, function (queObj) {
		var curObj = {};
		var curUnit = _.find(serverObject.units, { 'unitID': _.get(queObj, 'data.unitID') });

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

				dbMapServiceController.unitActions('save', curObj.data);

				serverObject.units.push(_.cloneDeep(curObj.data));
				updateQue['que'+parseFloat(_.get(queObj, 'data.coalition'))].push(_.cloneDeep(curObj));
				updateQue.queadmin.push(_.cloneDeep(curObj));
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
				dbMapServiceController.unitActions('update', curObj.data);

				updateQue['que'+curUnit.coalition].push(_.cloneDeep(curObj));
				updateQue.queadmin.push(_.cloneDeep(curObj));
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

			dbMapServiceController.unitActions('delete', curObj.data);
			_.remove(serverObject.units, { 'unitID': _.get(queObj, 'data.unitID') });
			updateQue['que1'].push(_.cloneDeep(curObj));
			updateQue['que2'].push(_.cloneDeep(curObj));
			updateQue.queadmin.push(_.cloneDeep(curObj));
		}

		//playerUpdate
		if (_.get(queObj, 'action') === 'players') {
			serverObject.players = queObj.data;
			_.forEach(serverObject.players, function(player) {
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
								sendInit(player.socketID);
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
								sendInit(player.socketID);
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
								sendInit(player.socketID);
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
								sendInit(player.socketID);
								console.log(player.name + ' is player in slot, side 2');
							}
						}
					}
				}
			});
			//apply local information object
			_.forEach(queObj.data, function ( data ){
				if(data) {
					if (!data.ucid) {
						_.set(data, '_id', data.ucid);
						dbMapServiceController.srcPlayerActions('update', data);
					}
				}
			});

			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
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
				dbMapServiceController.baseActions('update', curObj);
			});

			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}

		//Cmd Response
		if (_.get(queObj, 'action') === 'CMDRESPONSE') {
			//send response straight to client id
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}

		//mesg
		if (_.get(queObj, 'action') === 'MESG') {
			console.log(queObj);
			//console.log(serverObject.players);
			if(_.get(queObj, 'data.playerID') )
				if (_.isNumber(_.get(_.find(serverObject.players, { 'id': _.get(queObj, 'data.playerID') }), 'side', 0))) {
					updateQue['que'+_.get(_.find(serverObject.players, { 'id': _.get(queObj, 'data.playerID') }), 'side', 0)]
						.push(_.cloneDeep(queObj));
					updateQue.queadmin.push(_.cloneDeep(queObj));
				}
		}

		//events
		if (_.get(queObj, 'action') === 'friendly_fire') {
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'mission_end') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'kill') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'self_kill') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'change_slot') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'connect') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'disconnect') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'crash') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'eject') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'takeoff') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'landing') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		if (_.get(queObj, 'action') === 'pilot_death') {
			updateQue.que1.push(_.cloneDeep(queObj));
			updateQue.que2.push(_.cloneDeep(queObj));
			updateQue.que0.push(_.cloneDeep(queObj));
			updateQue.queadmin.push(_.cloneDeep(queObj));
		}
		return true;
	});
});


//emit payload, every sec to start
setInterval(function(){
	//units
	_.forEach(['que1','que2','que0','queadmin'], function (que) {
		var sendAmt = 0;

		//console.log(updateQue[que].length);
		if (updateQue[que].length < config.perSendMax) {
			sendAmt = updateQue[que].length;
		}else{
			sendAmt = config.perSendMax
		}
		var chkPayload = {que:[]};
		for (x=0; x < sendAmt; x++ ) {
			chkPayload.que.push(updateQue[que][0]);
			updateQue[que].shift();
		}
		//console.log('payload: '+chkPayload);
		if (que === 'que1' && chkPayload.que.length){
			io.to(1).emit('srvUpd', chkPayload);
		}
		if (que === 'que2' && chkPayload.que.length){
			io.to(2).emit('srvUpd', chkPayload);
		}
		if (que === 'que0' && chkPayload.que.length){
			io.to(0).emit('srvUpd', chkPayload);
		}
		if (que === 'queadmin' && chkPayload.que.length){
			io.to('admin').emit('srvUpd', chkPayload);
		}
	});
}, 1 * 500);


function getDCSDataClient(dataCallback) {

    var connOpen = true;

    const net = require('net');
    var buffer;

    function connect() {
        const client = net.createConnection({host: serverAddress, port: config.clientPort}, () => {
            var time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS Client!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
			initClear( 'client' );
            client.write('{"action":"NONE"}'+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                var data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
				request = _.get(serverObject, 'ClientRequestArray[0]',{action:'NONE'});
                client.write(JSON.stringify(request)+"\n");
                serverObject.ClientRequestArray.shift();
            }
        });

        client.on('close', () => {
            time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS Client....');
			io.emit('srvUpd', {que: [{action: 'reset'}]});
            connOpen = true;
        });

        client.on('error', () => {
            connOpen = true;
        });
    }

    setInterval(function(){
        if (connOpen === true) {
           connect();
        }else{
        }
    }, 1 * 1000);
};

function getDCSDataGameGui(dataCallback) {

	var connOpen = true;

	const net = require('net');
	var buffer;
	var request;

	function connect() {
		const client = net.createConnection({host: serverAddress, port: config.gameGuiPort}, () => {
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS GameGUI!');
			connOpen = false;
			buffer = "";
		});

		client.on('connect', function() {
			initClear( 'server' );
			client.write('{"action":"INIT"}'+"\n");
		});

		client.on('data', (data) => {
			buffer += data;
			while ((i = buffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(buffer.substring(0, i));
				dataCallback(data);
				buffer = buffer.substring(i + 1);
				request = _.get(serverObject, 'GameGUIrequestArray[0]',{action:'NONE'});
				client.write(JSON.stringify(request)+"\n");
				serverObject.GameGUIRequestArray.shift();
			}
		});

		client.on('close', () => {
			time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS GameGUI....');
			connOpen = true;
		});

		client.on('error', () => {
			connOpen = true;
		});
	}

	setInterval(function(){
		if (connOpen === true) {
			connect();
		}else{
		}
	}, 1 * 1000);
};

getDCSDataClient(syncDCSData);
getDCSDataGameGui(syncDCSDataGameGUI);

function syncDCSData (DCSData) {
	//console.log('mission: ',DCSData);
	//var timetest = new Date();
	//_.set(serverObject, 'ClientRequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'trigger.action.outText("IT WORKS MOFO!", 2)'});
	//accept updates

	if (!_.isEmpty(DCSData.que)) {
		serverObject.parse(DCSData);
    }
    //send commands back client
}

function syncDCSDataGameGUI (DCSData) {
	//var timetest = new Date();
	//_.set(serverObject, 'GameGUIrequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'net.get_player_list()'});
	//accept updates
	if (!_.isEmpty(DCSData.que)) {
		serverObject.parse(DCSData);
	}
	//send commands back client
}
