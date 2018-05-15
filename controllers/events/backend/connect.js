const _ = require('lodash');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processConnect', function (serverName, sessionName, eventObj) {
	var mesg = 'A: ' + _.get(eventObj, 'data.arg2', '?') + ' has connected';
	_.set(eventObj, ['data', 'mesg'], mesg);
	webPushCommands.sendToAll(serverName, {payload: eventObj});
	// "connect", playerID, name - no ucid lookup yet
	/*
	DCSLuaCommands.sendMesgToAll(
		serverName,
		mesg,
		5
	);
	*/
});

