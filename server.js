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
	'1': {
		units: [],
		msgs: [],
		events: []
	},
	'2': {
		units: [],
		msgs: [],
		events: []
	},
	globalMsgs: [],
	globalCmds: [],
	players: [],
	ClientRequestArray: [],
	GameGUIRequestArray: [],
	socketUsers: []
};
var updateQue = {
	que: []
};

//setup socket io
io.on('connection', function( socket ) {
	var remoteAddress = socket.handshake.address.replace(/^.*:/, '');
	console.log('New connection from ' + remoteAddress );


	/*
	var initSrvObj = {units: _.get(serverObject, 'units', [])};
	console.log(serverObject.units.length);
	if (initSrvObj.units.length > 0) {
		_.forEach(initSrvObj.units, function(unit) {
			var curObj = {
				curUnit: {}
			};
			curObj.curUnit = {
				unitID: parseFloat(_.get(unit, 'unitID')),
				type: _.get(unit, 'type'),
				coalition: parseFloat(_.get(unit, 'coalition')),
				lat: parseFloat(_.get(unit, 'lat')),
				lon: parseFloat(_.get(unit, 'lon')),
				playername: _.get(unit, 'playername', ''),
				action: 'INIT'
			};
			updateQue.unitUpdates.push(_.cloneDeep(curObj)); //send only to new user
		});
	}
	*/
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
	var curObj = {};
    if (_.get(update, 'action') == 'C') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(update, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(update, 'unitID') }).action = 'U';
        }else{
            curObj.curUnit = {
                unitID: parseFloat(_.get(update, 'unitID')),
                type: _.get(update, 'type'),
                coalition: parseFloat(_.get(update, 'coalition')),
                lat: parseFloat(_.get(update, 'lat')),
                lon: parseFloat(_.get(update, 'lon')),
                playername: _.get(update, 'playername', ''),
				action: 'C'
            };
            serverObject.units.push(_.cloneDeep(curObj.curUnit));
			updateQue.que.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(update, 'action') == 'U') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(update, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(update, 'unitID') }).lat = _.get(update, 'lat');
            _.find(serverObject.units, { 'unitID': _.get(update, 'unitID') }).lon =  _.get(update, 'lon');
			_.set(curObj,'curUnit', curUnit = {
                unitID: _.get(update, 'unitID'),
                lat: _.get(update, 'lat'),
                lon: _.get(update, 'lon'),
                action: 'U'
            });
			updateQue.que.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(update, 'action') == 'D') {
		_.set(curObj,'curUnit', {
            unitID: _.get(update, 'unitID'),
            action: 'D'
        });
		_.remove(serverObject.units, { 'unitID': _.get(update, 'unitID') });
		updateQue.que.push(_.cloneDeep(curObj));
    }

    //playerUpdate
	if (_.get(update, 'action') == 'players') {

		updateQue.que.push(_.cloneDeep(update.data));
		return true;
	}
});

//emit payload, every sec to start
setInterval(function(){
	//units
	var perSendMax = 500;
	var sendAmt = 0;

	if (updateQue.que.length < perSendMax) {
		sendAmt = updateQue.que.length;
	}else{
		sendAmt = perSendMax
	}

	var chkPayload = [];
	for (x=0; x < sendAmt; x++ ) {
		chkPayload.push(updateQue.que[0]);
		updateQue.que.shift();
	}
	//console.log(chkPayload);
	io.emit('srvUpd', chkPayload);

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
	console.log('mission: ',DCSData);
	//var timetest = new Date();
	//_.set(serverObject, 'ClientRequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'trigger.action.outText("IT WORKS MOFO!", 2)'});

	//accept updates
	if (!_.isEmpty(DCSData)) {
        _.forEach(DCSData, serverObject.parse);
    }
    //send commands back client
}

function syncDCSDataGameGUI (DCSData) {
	console.log('server: ',DCSData);
	//create requests from nodeserver if any exist
	//send command response to chatlog of users website
	//create listener from endusers to send commands to the server with/ sandbox/procedural call things
	//var timetest = new Date();
	//_.set(serverObject, 'GameGUIrequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'net.get_player_list()'});

	//accept updates
	if (!_.isEmpty(DCSData)) {
		_.forEach(DCSData, serverObject.parse);
	}
}
