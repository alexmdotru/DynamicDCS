﻿var _ = require('lodash');
var express = require('express');

var perSendMax = 500;

//startup node server
var app = express();

// app.use/routes/etc...
app.use('/', express.static(__dirname + '/dist'));
app.use('/json', express.static(__dirname + '/app/assets/json'));
app.use('/css', express.static(__dirname + '/app/assets/css'));
app.use('/tabs', express.static(__dirname + '/app/tabs'));
app.use('/libs', express.static(__dirname + '/node_modules'));

var server  = app.listen(8080);
var io  = require('socket.io').listen(server);

//setup globals
var serverObject = {
	units: [],
	msgs: [],
	events: [],
	globalMsgs: [],
	globalCmds: [],
	players: [],
	sockInfo: {},
	ClientRequestArray: [],
	GameGUIRequestArray: [],
	socketUsers: []
};
var updateQue = {
	que1: [],
	que2: [],
	quespectator: [],
	queadmin: []
};

//utility functions, move someday
function isNumeric(x) {
	return !(isNaN(x)) && (typeof x !== "object") &&
		(x != Number.POSITIVE_INFINITY) && (x != Number.NEGATIVE_INFINITY);
}

//setup socket io
io.on('connection', function( socket ) {
	var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	clientIpAddress = clientIpAddress.replace(/^.*:/, '');
	_.set(serverObject, 'sockInfo', {
		action: 'socketInfo',
		data: {
			id: socket.id,
			ip: clientIpAddress
		}
	});
	console.log(' new request from : '+clientIpAddress);
	//send socketid payload to client


	//client updates
	var initSrvObj =  _.get(serverObject, 'units', []);
	console.log("Units: "+serverObject.units.length);
	socket.on('clientUpd', function (data) {
		var initQue = {que:[]};
		var pSlot = _.get(_.find(serverObject.players, { 'socketID': _.get(socket, 'id') }), 'slot', '');
		var pSide = _.get(_.find(serverObject.players, { 'socketID': _.get(socket, 'id') }), 'side', 0);
		var spectator = {
			action: 'spectator',
			data: {}
		};
		//first resend clientInfo
		function initUnits (units, side) {
			if (units.length > 0) {
				_.forEach(units, function(unit) {
					if(_.get(unit, 'coalition') === side || side === 'A'){
						var curObj = {
							action: 'INIT',
							data: {
								unitID: parseFloat(_.get(unit, 'unitID')),
								type: _.get(unit, 'type'),
								coalition: parseFloat(_.get(unit, 'coalition')),
								lat: parseFloat(_.get(unit, 'lat')),
								lon: parseFloat(_.get(unit, 'lon')),
								playername: _.get(unit, 'playername', '')
							}
						};
						initQue.que.push(_.cloneDeep(curObj));
					}
				});
			}
		}

		if (data.action === 'unitINIT') {
			initQue.que.push(_.get(serverObject, 'sockInfo'));
			if(false){
			//isadmin
				console.log('user is admin');
				initUnits (initSrvObj, 'A');

			}else if(isNumeric(parseInt(pSlot))){
				//real vehicle, send correct side info
				console.log('user in vehicle: ',pSlot);
				initUnits (initSrvObj, pSide);
			}else if(pSlot){
				//user on side but not in vehicle
				console.log('user on side but not in vehicle: ',pSlot);
				initUnits (initSrvObj, pSide);
			}else{
				//user not chosen side
				console.log('user not on side: ');
				initUnits (spectator, pSide);
			}

			var sendAmt = 0;
			//console.log(updateQue[que].length);
			if (initQue.que.length < perSendMax) {
				sendAmt = initQue.que.length;
			}else{
				sendAmt = perSendMax
			}
			var chkPayload = {que:[]};
			for (x=0; x < sendAmt; x++ ) {
				chkPayload.que.push(initQue.que[0]);
				initQue.que.shift();
			}
			io.to(socket.id).emit('srvUpd', chkPayload);
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

_.set(serverObject, 'oppositeSide', function(side){
	if(side === 1){
		return 2;
	}
	return 1;
});

_.set(serverObject, 'parse', function (update) {
	//console.log(_.get(update, 'action'));
	var curObj = {};
    if (_.get(update, 'action') === 'C') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }).action = 'U';
        }else{
            curObj = {
            	action: 'C',
            	data: {
					unitID: parseFloat(_.get(update, 'data.unitID')),
					type: _.get(update, 'data.type'),
					coalition: parseFloat(_.get(update, 'data.coalition')),
					lat: parseFloat(_.get(update, 'data.lat')),
					lon: parseFloat(_.get(update, 'data.lon')),
					playername: _.get(update, 'data.playername', '')
				}
			};
            serverObject.units.push(_.cloneDeep(curObj.data));
			updateQue['que'+parseFloat(_.get(update, 'data.coalition'))].push(_.cloneDeep(curObj));
			updateQue.queadmin.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(update, 'action') === 'U') {
		if (typeof _.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }).lat = _.get(update, 'data.lat');
            _.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }).lon =  _.get(update, 'data.lon');
			curObj = {
				action: 'U',
				data: {
					unitID: _.get(update, 'data.unitID'),
					lat: _.get(update, 'data.lat'),
					lon: _.get(update, 'data.lon'),
				}
            };
			updateQue['que'+_.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }).coalition].push(_.cloneDeep(curObj));
			updateQue.queadmin.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(update, 'action') === 'D') {
		curObj = {
			action: 'D',
			data: {
				unitID: _.get(update, 'data.unitID'),
				lat: _.get(update, 'data.lat'),
				lon: _.get(update, 'data.lon'),
			}
		};
		_.remove(serverObject.units, { 'unitID': _.get(update, 'unitID') });
		updateQue['que'+_.find(serverObject.units, { 'unitID': _.get(update, 'data.unitID') }).coalition].push(_.cloneDeep(curObj));
		updateQue.queadmin.push(_.cloneDeep(curObj));
    }

    //playerUpdate
	if (_.get(update, 'action') === 'players') {
		var resetClient = {action: 'reset'};
		serverObject.players = update.data;
		_.forEach(serverObject.players, function(player) {
			var pArry = player.ipaddr.split(":");
			if(pArry[0] === '' ){
				_.set(player, 'socketID', _.get(_.find(_.get(io, 'sockets.sockets'), function (socket) {
					if(socket.conn.remoteAddress === '::ffff:127.0.0.1' || socket.conn.remoteAddress === '::1'){
						return true;
					}
					return false;
				}), 'id', {}));
			}else{
				_.set(player, 'socketID', _.get(_.find(_.get(io, 'sockets.sockets'), function (socket) {
					if(socket.conn.remoteAddress === '::ffff:'+player.ipaddr){
						return true;
					}
					return false;
				}), 'id', {}));
			}

			//rewrite this someday, sets up the socket.io information rooms for updates
			if(!_.isEmpty(player.socketID)) {
				if (false) {
					//figure admins later
					console.log('socket is admin');
					if (io.sockets.adapter.sids[player.socketID]['1']) {
						io.sockets.sockets[player.socketID].leave(1);
					}
					if (io.sockets.adapter.sids[player.socketID]['2']) {
						io.sockets.sockets[player.socketID].leave(2);
					}
					if (io.sockets.adapter.sids[player.socketID]['spectator']) {
						io.sockets.sockets[player.socketID].leave('spectator');
					}
					if (!io.sockets.adapter.sids[player.socketID]['admin']) {
						io.sockets.sockets[player.socketID].join('admin');
						updateQue.queadmin.push(resetClient);
					}
				}else if (player.side === 0) {
					console.log('socket is spectator');
					if (io.sockets.adapter.sids[player.socketID]['1']) {
						io.sockets.sockets[player.socketID].leave(1);
					}
					if (io.sockets.adapter.sids[player.socketID]['2']) {
						io.sockets.sockets[player.socketID].leave(2);
					}
					if (io.sockets.adapter.sids[player.socketID]['admin']) {
						io.sockets.sockets[player.socketID].leave('admin');
					}
					if (!io.sockets.adapter.sids[player.socketID]['spectator']) {
						io.sockets.sockets[player.socketID].join('spectator');
						updateQue.quespectator.push(resetClient);
					}
				}else if (player.side === 1) {
					console.log('socket is player in slot, side 1');
					if (io.sockets.adapter.sids[player.socketID]['admin']) {
						io.sockets.sockets[player.socketID].leave('admin');
					}
					if (io.sockets.adapter.sids[player.socketID]['spectator']) {
						io.sockets.sockets[player.socketID].leave('spectator');
					}
					if (io.sockets.adapter.sids[player.socketID]['2']) {
						io.sockets.sockets[player.socketID].leave(2);
					}
					if (!io.sockets.adapter.sids[player.socketID]['1']) {
						console.log('join socket 1');
						io.sockets.sockets[player.socketID].join(1);
						updateQue.que1.push(resetClient);
					}
				}else if (player.side === 2) {
					console.log('socket is player in slot, side 2');
					if (io.sockets.adapter.sids[player.socketID]['admin']) {
						io.sockets.sockets[player.socketID].leave('admin');
					}
					if (io.sockets.adapter.sids[player.socketID]['spectator']) {
						io.sockets.sockets[player.socketID].leave('spectator');
					}
					if (io.sockets.adapter.sids[player.socketID]['1']) {
						io.sockets.sockets[player.socketID].leave(1);
					}
					if (!io.sockets.adapter.sids[player.socketID]['2']) {
						console.log('join socket 2');
						io.sockets.sockets[player.socketID].join(2);
						updateQue.que2.push(resetClient);
					}
				}
			}
		});
		//apply local information object
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}

	//Cmd Response
	if (_.get(update, 'action') === 'CMDRESPONSE') {
    	//send response straight to client id
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}

	//mesg
	if (_.get(update, 'action') === 'MESG') {
		if (_.isNumber(_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).side)) {
			updateQue['que'+_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).side]
				.push(_.cloneDeep(update));
		}
		updateQue.queadmin.push(_.cloneDeep(update));
	}

	//events
	if (_.get(update, 'action') === 'friendly_fire') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'mission_end') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'kill') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'self_kill') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'change_slot') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'connect') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'disconnect') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'crash') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'eject') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'takeoff') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'landing') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') === 'pilot_death') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
		updateQue.quespectator.push(_.cloneDeep(update));
		updateQue.queadmin.push(_.cloneDeep(update));
	}
	return true;
});


//emit payload, every sec to start
setInterval(function(){
	//units
	_.forEach(['que1','que2','quespectator','queadmin'], function (que) {
		var sendAmt = 0;

		//console.log(updateQue[que].length);
		if (updateQue[que].length < perSendMax) {
			sendAmt = updateQue[que].length;
		}else{
			sendAmt = perSendMax
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
		if (que === 'quespectator' && chkPayload.que.length){
			io.to('spectator').emit('srvUpd', chkPayload);
		}
		if (que === 'queadmin' && chkPayload.que.length){
			io.to('admin').emit('srvUpd', chkPayload);
		}
	});
}, 1 * 500);

function getDCSDataClient(dataCallback) {

    const PORT = 3001;
    const ADDRESS = "127.0.0.1";
    var connOpen = true;

    const net = require('net');
    var buffer;

    function connect() {

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            var time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS Client!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
            client.write('{"action":"INIT"}'+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                var data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
				request = _.get(serverObject, 'ClientRequestArray[0]',{action:'NONE'});
                client.write(JSON.stringify(request)+"\n");
                _.set(_.drop(_.get(serverObject, 'ClientRequestArray'), 1));
            }
        });

        client.on('close', () => {
            time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS Client....');
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

	var port = 3002;
	var address = "127.0.0.1";
	var connOpen = true;

	const net = require('net');
	var buffer;
	var request;

	function connect() {



		const client = net.createConnection({host: address, port: port}, () => {
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS GameGUI!');
			connOpen = false;
			buffer = "";
		});

		client.on('connect', function() {;
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
				_.set(_.drop(_.get(serverObject, 'GameGUIrequestArray'), 1));
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
        _.forEach(DCSData.que, serverObject.parse);
    }
    //send commands back client
}

function syncDCSDataGameGUI (DCSData) {
	//var timetest = new Date();
	//_.set(serverObject, 'GameGUIrequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'net.get_player_list()'});
	//accept updates
	if (!_.isEmpty(DCSData.que)) {
		_.forEach(DCSData.que, serverObject.parse);
	}
	//send commands back client
}
