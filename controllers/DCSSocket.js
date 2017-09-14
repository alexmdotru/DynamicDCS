const net = require('net'),
	_ = require('lodash');

const dbMapServiceController = require('./dbMapService'); // reqClientArray, regGameGuiArray

exports.createSocket = function (serverName, serverAddress, clientPort, gameGuiPort, callback, io, initClear) {
	var dsock = this;
	_.set(dsock, 'serverName', serverName);
	_.set(dsock, 'serverAddress', serverAddress);
	_.set(dsock, 'clientPort', clientPort);
	_.set(dsock, 'GameGuiPort', gameGuiPort);
	_.set(dsock, 'callback', callback);
	_.set(dsock, 'io', io);
	_.set(dsock, 'initClear', initClear);
	_.set(dsock, 'clientConnOpen', true);
	_.set(dsock, 'gameGUIConnOpen', true);
	_.set(dsock, 'client', {});
	_.set(dsock, 'gameGUI', {});
	_.set(dsock, 'clientBuffer', {});
	_.set(dsock, 'gameGUIBuffer', {});
	_.set(dsock, 'startTime', new Date().valueOf() );
	_.set(dsock, 'sessionName', serverName+'_'+dsock.startTime);
	_.set(dsock, 'writeQue.client', []);
	_.set(dsock, 'writeQue.gameGUI', []);

	setInterval(function () { //sending FULL SPEED AHEAD, 1 per milsec (watch for weird errors, etc)
		dbMapServiceController.cmdQueActions('grabNextQue', serverName, {queName: 'clientArray'})
			.then(function (resp) {
				if (resp) {
					_.get(dsock, 'writeQue.client').push({
						action: resp.actionObj.action,
						cmd: resp.actionObj.cmd,
						reqID: resp._id
					});
				}
			})
		;
		dbMapServiceController.cmdQueActions('grabNextQue', serverName, {queName: 'GameGuiArray'})
			.then(function (resp) {
				if (resp) {
					_.get(dsock, 'writeQue.gameGUI').push({
						action: resp.actionObj.action,
						cmd: resp.actionObj.cmd,
						reqID: resp._id
					});
				}
			})
		;
	}, 600);

	dsock.connectClient = function () {
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
				dsock.client.write(JSON.stringify(_.get(dsock, ['writeQue', 'client', 0], '')) + "\n");
				_.get(dsock, ['writeQue', 'client']).shift();
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
	};
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
				dsock.gameGUI.write(JSON.stringify(_.get(dsock, ['writeQue', 'gameGUI', 0], '')) + "\n");
				_.get(dsock, ['writeQue', 'gameGUI']).shift();
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
};
