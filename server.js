var _ = require('lodash');
var express = require('express');

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
	ClientRequestArray: [],
	GameGUIRequestArray: [],
	socketUsers: []
};
var updateQue = {
	que1: [],
	que2: [],
	queall: []
};

//setup socket io
io.on('connection', function( socket ) {

	var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	clientIpAddress = clientIpAddress.replace(/^.*:/, '');
	console.log(' new request from : '+clientIpAddress);

	//client updates
	var initSrvObj =  _.get(serverObject, 'units', []);
	console.log("Units: "+serverObject.units.length);
	socket.on('clientUpd', function (data) {
		//cmd and mesg's from clients, authenticate
		console.log(data);
		if (initSrvObj.length > 0) {
			_.forEach(initSrvObj, function(unit) {
				//console.log(unit);
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
				updateQue['que'+parseFloat(_.get(unit, 'coalition'))].push(_.cloneDeep(curObj));
			});
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
    if (_.get(update, 'action') == 'C') {
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
        }
    }
    if (_.get(update, 'action') == 'U') {
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
        }
    }
    if (_.get(update, 'action') == 'D') {
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
    }

    //playerUpdate
	if (_.get(update, 'action') == 'players') {
		serverObject.players = update.data;
		_.forEach(serverObject.players, function(player) {
			var opSide = serverObject.oppositeSide(player.side);
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
			if(!_.isEmpty(player.socketID)) {
				if (!io.sockets.adapter.sids[player.socketID][player.side]) {
					io.sockets.sockets[player.socketID].join(player.side);
					io.sockets.sockets[player.socketID].leave(opSide);
				}
			}
		});
		//apply local information object
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}

	//Cmd Response
	if (_.get(update, 'action') == 'CMDRESPONSE') {
    	//send response straight to client id
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}

	//mesg
	if (_.get(update, 'action') == 'MESG') {
    	//console.log(_.get(update, 'data.message'),
		//	_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).side,
		//	_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).name);
    	//see if player is on side, map him to que
		//console.log(_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).coalition);
		if (_.isNumber(_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).side)) {
			updateQue['que'+_.find(serverObject.players, { 'id': _.get(update, 'data.playerID') }).side]
				.push(_.cloneDeep(update));
		}
	}

	//events
	if (_.get(update, 'action') == 'friendly_fire') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'mission_end') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'kill') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'self_kill') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'change_slot') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'connect') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'disconnect') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'crash') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'eject') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'takeoff') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'landing') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	if (_.get(update, 'action') == 'pilot_death') {
		updateQue.que1.push(_.cloneDeep(update));
		updateQue.que2.push(_.cloneDeep(update));
	}
	return true;
});


//emit payload, every sec to start
setInterval(function(){
	//units
	_.forEach(['que1','que2'], function (que) {
		var perSendMax = 500;
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
			//console.log(x);
		}
		//console.log('payload: '+chkPayload);
		if (que === 'que1' && chkPayload.que.length){
			//console.log('B1');
			io.to(1).emit('srvUpd', chkPayload);
		}
		if (que === 'que2' && chkPayload.que.length){
			//console.log('B2');
			io.to(2).emit('srvUpd', chkPayload);
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
