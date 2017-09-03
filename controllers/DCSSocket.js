const net = require('net'),
	_ = require('lodash');

const dbMapServiceController = require('./dbMapService'); // reqClientArray, regGameGuiArray

exports.createSocket = function (serverName, serverAddress, clientPort, gameGuiPort, callback, io, initClear) {
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
			var curClientCmd = {};
			dsock.clientBuffer += data;
			while ((i = dsock.clientBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.clientBuffer.substring(0, i));
				dsock.callback(serverName, dsock.sessionName, data);
				dsock.clientBuffer = dsock.clientBuffer.substring(i + 1);
				dsock.client.write(JSON.stringify({action: 'NONE'}) + "\n");
				dbMapServiceController.cmdQueActions('grabNextQue', serverName, {queName: 'clientArray'})
					.then(function (resp) {
						if (resp) {
							if (resp.actionObj.action === 'CMD') {
								if (resp.actionObj.cmd) {
									dsock.reqClientArray = {
										action: resp.actionObj.action,
										cmd: resp.actionObj.cmd,
										reqID: resp._id
									};
								}
							} else {
								dsock.reqClientArray = {
									action: resp.actionObj.action,
									cmd: '',
									reqID: resp._id
								};
							}
						} else {
							dsock.reqClientArray = {action: 'NONE'};
						}
					})
				;
				curClientCmd = _.get(dsock, 'reqClientArray', {action: 'NONE'});
				dsock.client.write(JSON.stringify(curClientCmd) + "\n"); // dont ever let this line wait, it will stop the entire server waiting......
				// console.log('cmdclient: ', curClientCmd);
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
			var curGameGuiCmd = {};
			dsock.gameGUIBuffer += data;
			while ((i = dsock.gameGUIBuffer.indexOf("\n")) >= 0) {
				var data = JSON.parse(dsock.gameGUIBuffer.substring(0, i));
				dsock.callback(serverName, dsock.sessionName, data);
				dsock.gameGUIBuffer = dsock.gameGUIBuffer.substring(i + 1);
				dsock.gameGUI.write(JSON.stringify({action: 'NONE'}) + "\n"); // dont ever let this line wait, it will stop the entire server waiting......
				dbMapServiceController.cmdQueActions('grabNextQue', serverName, {queName: 'GameGuiArray'})
					.then(function (resp) {
						if (resp) {
							if( resp.action === 'CMD' ) {
								if (resp.cmd) {
									dsock.reqGameGuiArray = {
										action: resp.action,
										cmd: resp.cmd,
										reqID: resp._id
									};
								}
							} else {
								dsock.reqGameGuiArray = {
									action: resp.action,
									cmd: '',
									reqID: resp._id
								};
							}
						} else {
							dsock.reqGameGuiArray = {action: 'NONE'};
						}
					})
				;
				curGameGuiCmd = _.get(dsock, 'reqGameGuiArray', {action: 'NONE'});
				// console.log('curgamegui: '+ curGameGuiCmd.action);
				dsock.gameGUI.write(JSON.stringify(curGameGuiCmd) + "\n"); // dont ever let this line wait, it will stop the entire server waiting......
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
