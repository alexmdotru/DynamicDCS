const net = require('net'),
	_ = require('lodash');

function DCSSocket(serverName, serveraddress, clientPort, gameGuiPort, callback, io, initClear, reqClientArray, regGameGuiArray) {
	var dsock = this;
	dsock.serverName = serverName;
	dsock.serveraddress = serveraddress;
	dsock.clientPort = clientPort;
	dsock.GameGuiPort = gameGuiPort;
	dsock.callback = callback;
	dsock.io = io;
	dsock.initClear = initClear;
	dsock.reqClientArray = reqClientArray;
	dsock.regGameGuiArray = regGameGuiArray;
	dsock.clientConnOpen = true;
	dsock.gameGUIConnOpen = true;
	dsock.client;
	dsock.gameGUI;
	dsock.clientBuffer;
	dsock.gameGUIBuffer;
	dsock.connectClient = function () {
		dsock.client = net.createConnection({
			host: dsock.serverAddress,
			port: dsock.clientPort
		}, () => {
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS Client!');
			dsock.clientConnOpen = false;
			dsock.clientBuffer = "";
		});
		dsock.client.on('connect', function () {
			dsock.initClear('client');
			dsock.client.write('{"action":"NONE"}' + "\n");
		});
		dsock.client.on('data', (data) => {
			dsock.clientBuffer += data;
			while ((i = dsock.clientBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.clientBuffer.substring(0, i));
				dsock.callback(data);
				dsock.clientBuffer = dsock.clientBuffer.substring(i + 1);
				dsock.client.write(JSON.stringify(_.get(dsock, 'reqClientArray', {action: 'NONE'})) + "\n");
				dsock.reqClientArray.shift();
			}
		});

		dsock.client.on('close', () => {
			time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS Client....');
			dsock.io.emit('srvUpd', {que: [{action: 'reset'}]});
			dsock.clientConnOpen = true;
		});

		dsock.client.on('error', () => {
			dsock.clientConnOpen = true;
		});
	},
	dsock.connectServer = function () {
		dsock.gameGUI = net.createConnection({
			host: dsock.serverAddress,
			port: dsock.GameGuiPort
		}, () => {
			var time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS GameGUI!');
			dsock.gameGUIConnOpen = false;
			dsock.gameGUIBuffer = "";
		});
		dsock.gameGUI.on('connect', function () {
			dsock.initClear('server');
			dsock.gameGUI.write('{"action":"NONE"}' + "\n");
		});
		dsock.gameGUI.on('data', (data) => {
			dsock.gameGUIBuffer += data;
			while ((i = dsock.gameGUIBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.gameGUIBuffer.substring(0, i));
				dsock.callback(data);
				dsock.gameGUIBuffer = dsock.gameGUIBuffer.substring(i + 1);
				dsock.gameGUI.write(JSON.stringify(_.get(dsock, 'regGameGuiArray', {action: 'NONE'})) + "\n");
				dsock.regGameGuiArray.shift();
			}
		});
		dsock.gameGUI.on('close', () => {
			time = new Date();
			console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting DCS GameGUI....');
			dsock.io.emit('srvUpd', {que: [{action: 'reset'}]});
			dsock.gameGUIConnOpen = true;
		});
		dsock.gameGUI.on('error', () => {
			dsock.gameGUIConnOpen = true;
		});
	};
}

module.exports = DCSSocket;
