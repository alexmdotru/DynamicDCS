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
var serverObject = {};
var updSrvObj = {};
_.set(serverObject, 'units', []);
_.set(serverObject, 'ClientRequestArray', []);
_.set(serverObject, 'GameGUIRequestArray', []);
_.set(serverObject, 'socketUsers', []);
var updateQue = {
	updates: []
};

//setup socket io
io.on('connection', function( socket ) {


	var updSrvObj = {units: _.get(serverObject, 'units', [])};
	console.log(serverObject.units.length);
	if (updSrvObj.units.length > 0) {
		_.forEach(updSrvObj.units, function(unit) {
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
			updateQue.updates.push(_.cloneDeep(curObj));
		});
	};
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

_.set(serverObject, 'unitParse', function (unit) {
	var curObj = {
		curUnit: []
	};
    if (_.get(unit, 'action') == 'C') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).action = 'U';
        }else{
            curObj.curUnit = {
                unitID: parseFloat(_.get(unit, 'unitID')),
                type: _.get(unit, 'type'),
                coalition: parseFloat(_.get(unit, 'coalition')),
                lat: parseFloat(_.get(unit, 'lat')),
                lon: parseFloat(_.get(unit, 'lon')),
                playername: _.get(unit, 'playername', ''),
				action: 'C'
            };
            serverObject.units.push(_.cloneDeep(curObj.curUnit));
			updateQue.updates.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(unit, 'action') == 'U') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).lat = _.get(unit, 'lat');
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).lon =  _.get(unit, 'lon');
			_.set(curObj,'curUnit', curUnit = {
                unitID: _.get(unit, 'unitID'),
                lat: _.get(unit, 'lat'),
                lon: _.get(unit, 'lon'),
                action: 'U'
            });
			updateQue.updates.push(_.cloneDeep(curObj));
        }
    }
    if (_.get(unit, 'action') == 'D') {
		_.set(curObj,'curUnit', {
            unitID: _.get(unit, 'unitID'),
            action: 'D'
        });
		_.remove(serverObject.units, { 'unitID': _.get(unit, 'unitID') });
		updateQue.updates.push(_.cloneDeep(curObj));
    }
    return true;
});

//emit payload, every sec to start
setInterval(function(){
	var perSendMax = 500;
	var sendAmt = 0;
	if (updateQue.updates.length < perSendMax) {
		sendAmt = updateQue.updates.length;
	}else{
		sendAmt = perSendMax
	}

	var chkPayload = [];
	for (x=0; x < sendAmt; x++ ) {
		chkPayload.push(updateQue.updates[0]);
		updateQue.updates.shift();
	}
	io.emit('srvUnitUpd', chkPayload);
}, 1 * 500);

function getDCSDataClient(dataCallback) {

    const PORT = 3001;
    const ADDRESS = "127.0.0.1";
    var connOpen = true;

    const net = require('net');
    var buffer;

    function connect() {

        //gather request from request array
        var request = _.get(serverObject, 'ClientRequestArray[0]',{action:'NONE'});

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            var time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS Client!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
            updSrvObj = _.cloneDeep(serverObject);
            _.set(updSrvObj, 'action', "INIT");
            client.write('{"action":"INIT"}'+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                var data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
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

		client.on('connect', function() {
			updSrvObj = _.cloneDeep(serverObject);
			_.set(updSrvObj, 'action', "INIT");
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
    if (!_.isEmpty(DCSData.units)) {
        _.forEach(DCSData.units, serverObject.unitParse);
    }
}

function syncDCSDataGameGUI (DCSData) {
		console.log(DCSData);


	//create requests from nodeserver if any exist
	//send command response to chatlog of users website
	//create listener from endusers to send commands to the server with/ sandbox/procedural call things
	//var timetest = new Date();
	//_.set(serverObject, 'GameGUIrequestArray[0]', {action:'CMD',  reqID: _.random(1,9999)+'|'+timetest.getHours() + ':' + timetest.getMinutes() + ':' + timetest.getSeconds(), cmd:'net.get_player_list()'});
}
