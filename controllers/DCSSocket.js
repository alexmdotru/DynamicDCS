const net = require('net'),
	_ = require('lodash');

const dbMapServiceController = require('./dbMapService'); // reqClientArray, regGameGuiArray

function DCSSocket(serverName, serverAddress, clientPort, gameGuiPort, callback, io, initClear) {
	var dsock = this;
	dsock.serverName = serverName;
	dsock.serverAddress = serverAddress;
	dsock.clientPort = clientPort;
	dsock.GameGuiPort = gameGuiPort;
	dsock.callback = callback;
	dsock.io = io;
	dsock.initClear = initClear;
	dsock.clientConnOpen = true;
	dsock.gameGUIConnOpen = true;
	dsock.client = {};
	dsock.gameGUI = {};
	dsock.clientBuffer = {};
	dsock.gameGUIBuffer = {};
	dsock.startTime = new Date().valueOf() ;
	dsock.sessionName = serverName+'_'+dsock.startTime;

	dsock.connectClient = function () {
		setInterval(function () { // keep ques updated from database updated to the database
			dbMapServiceController.cmdQueActions('read', serverName, {queName: 'clientArray'})
				.then(function (resp) {
					console.log('clientArry: ',resp);
					dsock.reqClientArray = resp;
				});
			dbMapServiceController.cmdQueActions('read', serverName, {queName: 'gameGuiArray'})
				.then(function (resp) {
					console.log('gameGuiArry: ',resp);
					dsock.regGameGuiArray = resp;
				});
		}, 500);

		dsock.client = net.createConnection({
			host: dsock.serverAddress,
			port: dsock.clientPort
		}, () => {
			console.log('sessionname: ', dsock.sessionName);
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS Client at '+dsock.serverAddress+':'+dsock.clientPort+' !');
			dsock.clientConnOpen = false;
			dsock.clientBuffer = "";
		});
		dsock.client.on('connect', function () {
			dsock.startTime = new Date().valueOf() ;
			dsock.sessionName = serverName+'_'+dsock.startTime;
			dsock.initClear(serverName, 'client');
			dsock.client.write('{"action":"NONE"}' + "\n");
		});
		dsock.client.on('data', (data) => {
			dsock.clientBuffer += data;
			while ((i = dsock.clientBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.clientBuffer.substring(0, i));
				dsock.callback(serverName, dsock.sessionName, data);
				dsock.clientBuffer = dsock.clientBuffer.substring(i + 1);
				dsock.client.write(JSON.stringify(_.get(dsock, 'reqClientArray', {action: 'NONE'})) + "\n");
				// dsock.reqClientArray.shift();
			}
		});

		dsock.client.on('close', () => {
			time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS Client on '+dsock.serverAddress+':'+dsock.clientPort+'....');
			dsock.io.emit('srvUpd', {que: [{action: 'reset'}]});
			dsock.clientConnOpen = true;
		});

		dsock.client.on('error', function (err) {
			dsock.clientConnOpen = true;
			console.log('Client Error: ', err);
		});
	},
	dsock.connectServer = function () {
		dsock.gameGUI = net.createConnection({
			host: dsock.serverAddress,
			port: dsock.GameGuiPort
		}, () => {
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS GameGUI at '+dsock.serverAddress+':'+dsock.GameGuiPort+'!');
			dsock.gameGUIConnOpen = false;
			dsock.gameGUIBuffer = "";
		});
		dsock.gameGUI.on('connect', function () {
			dsock.initClear(serverName, 'server');
			dsock.gameGUI.write('{"action":"NONE"}' + "\n");
		});
		dsock.gameGUI.on('data', (data) => {
			dsock.gameGUIBuffer += data;
			while ((i = dsock.gameGUIBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.gameGUIBuffer.substring(0, i));
				dsock.callback(serverName, dsock.sessionName, data);
				dsock.gameGUIBuffer = dsock.gameGUIBuffer.substring(i + 1);
				dsock.gameGUI.write(JSON.stringify(_.get(dsock, 'regGameGuiArray', {action: 'NONE'})) + "\n");
				// dsock.regGameGuiArray.shift();
			}
		});
		dsock.gameGUI.on('close', () => {
			time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS GameGUI at '+dsock.serverAddress+':'+dsock.GameGuiPort+'....');
			dsock.io.emit('srvUpd', {que: [{action: 'reset'}]});
			dsock.gameGUIConnOpen = true;
		});
		dsock.gameGUI.on('error', function (err) {
			dsock.gameGUIConnOpen = true;
			console.log('GameGUI Error: ', err);
		});
	};
}

module.exports = DCSSocket;
