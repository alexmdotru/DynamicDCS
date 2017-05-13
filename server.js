var _ = require('lodash');
var express = require('express');

//startup node server
var app = express();

// app.use/routes/etc...
app.use('/', express.static(__dirname + '/dist'));
app.use('/json', express.static(__dirname + '/app/assets/json'));
app.use('/libs', express.static(__dirname + '/node_modules'));

var server  = app.listen(8080);
var io  = require('socket.io').listen(server);

//setup globals
var serverObject = {};
var updSrvObj = {};
_.set(serverObject, 'units', []);
_.set(serverObject, 'requestArray', []);
_.set(serverObject, 'socketUsers', []);
var curObj = {};

//setup socket io
io.on('connection', function( socket ) {


	var updSrvObj = {units: _.get(serverObject, 'units', [])};

	_.set(updSrvObj, 'action', "INIT");
	console.log(serverObject.units.length);

	if (updSrvObj.units.length > 0) {
		_.forEach(updSrvObj.units, function(unit) {
			curUnit = {
				unitID: parseFloat(_.get(unit, 'unitID')),
				type: _.get(unit, 'type'),
				coalition: parseFloat(_.get(unit, 'coalition')),
				lat: parseFloat(_.get(unit, 'lat')),
				lon: parseFloat(_.get(unit, 'lon')),
				playername: _.get(unit, 'playername', '')
			};
			_.set(curUnit, 'action', 'INIT');
			io.emit('srvUnitUpd', curUnit);
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
            io.emit('srvUnitUpd', curObj);
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
            io.emit('srvUnitUpd', curObj);
        }
    }
    if (_.get(unit, 'action') == 'D') {
        _.remove(serverObject.units, { 'unitID': _.get(unit, 'unitID') });
		_.set(curObj,'curUnit', curUnit = {
            unitID: _.get(unit, 'unitID'),
            action: 'D'
        });
        io.emit('srvUnitUpd', curObj);
    }
    return true;
});

function getDCSData(dataCallback) {

    const PORT = 3001;
    const ADDRESS = "127.0.0.1";
    var connOpen = true;

    const net = require('net');
    var buffer;

    function connect() {

        //gather request from request array
        var request = _.get(serverObject, 'requestArray[0]',"NONE");

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            var time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS server!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
            updSrvObj = _.cloneDeep(serverObject);
            _.set(updSrvObj, 'action', "INIT");
            io.emit('srvUpd', updSrvObj);
            client.write('{"action":"INIT"}'+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                var data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
                client.write('{"action":"'+request+'"'+"}\n");
                _.get(serverObject, 'requestArray').shift();
            }
        });

        client.on('close', () => {
            time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting....');
			connect();
            connOpen = true;
        });

        client.on('error', () => {
			connect();
            connOpen = true;
        });
    }
/*
    setInterval(function(){
        if (connOpen === true) {
            connect();
        }else{
        }
    }, 1 * 1000);
*/
	connect();
};

getDCSData(syncDCSData);

function syncDCSData (DCSData) {
    if (!_.isEmpty(DCSData.units)) {
        _.forEach(DCSData.units, serverObject.unitParse);
    }
}
