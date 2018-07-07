const	_ = require('lodash');
// const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');

var curSecs = 0;
var maxTime = 21600;
var mesg;

exports.timerObj = {};

//only 6 hour rotation allowed atm
_.set(exports, 'processTimer', function (serverName, serverSecs) {
	curSecs = serverSecs;

	//5 hours
	if (serverSecs > 3600 && !_.get(exports, 'timerObj.fiveHours', true)) {
		mesg = 'Server is restarting in 5 hours!';
		_.set(exports, 'timerObj.fiveHours', true)
	}
	//4 hours
	if (serverSecs > 7200 && !_.get(exports, 'timerObj.fourHours', true)) {
		mesg = 'Server is restarting in 4 hours!';
		_.set(exports, 'timerObj.fourHours', true)
	}
	//3 hours
	if (serverSecs > 10800 && !_.get(exports, 'timerObj.threeHours', true)) {
		mesg = 'Server is restarting in 3 hours!';
		_.set(exports, 'timerObj.threeHours', true)
	}
	//2 hours
	if (serverSecs > 14400 && !_.get(exports, 'timerObj.twoHours', true)) {
		mesg = 'Server is restarting in 2 hours!';
		_.set(exports, 'timerObj.twoHours', true)
	}
	//1 hour
	if (serverSecs > 18000 && !_.get(exports, 'timerObj.oneHour', true)) {
		mesg = 'Server is restarting in 1 hours!';
		_.set(exports, 'timerObj.oneHour', true)
	}
	//30 mins
	if (serverSecs > 19800 && !_.get(exports, 'timerObj.thirtyMinutes', true)) {
		mesg = 'Server is restarting in 30 minutes!';
		_.set(exports, 'timerObj.thirtyMinutes', true)
	}
	//20 mins
	if (serverSecs > 20400 && !_.get(exports, 'timerObj.twentyMinutes', true)) {
		mesg = 'Server is restarting in 20 mins!';
		_.set(exports, 'timerObj.twentyMinutes', true)
	}
	//10 mins
	if (serverSecs > 21000 && !_.get(exports, 'timerObj.tenMinutes', true)) {
		mesg = 'Server is restarting in 10 mins!';
		_.set(exports, 'timerObj.tenMinutes', true)
	}
	//5 mins
	if (serverSecs > 21300 && !_.get(exports, 'timerObj.fiveMinutes', true)) {
		mesg = 'Server is restarting in 5 minutes!';
		_.set(exports, 'timerObj.fiveMinutes', true)
	}
	//4 mins
	if (serverSecs > 21360 && !_.get(exports, 'timerObj.fourMinutes', true)) {
		mesg = 'Server is restarting in 4 minutes!';
		_.set(exports, 'timerObj.fourMinutes', true)
	}
	//3 mins
	if (serverSecs > 21420 && !_.get(exports, 'timerObj.threeMinutes', true)) {
		mesg = 'Server is restarting in 3 minutes!';
		_.set(exports, 'timerObj.threeMinutes', true)
	}
	//2 mins
	if (serverSecs > 21480 && !_.get(exports, 'timerObj.twoMinutes', true)) {
		mesg = 'Server is restarting in 2 minutes!';
		_.set(exports, 'timerObj.twoMinutes', true)
	}

	//1 min
	if (serverSecs > 21540 && !_.get(exports, 'timerObj.oneMinute')) {
		mesg = 'Server is restarting in 1 minute!';
		_.set(exports, 'timerObj.oneMinute', true)
	}
	//restart server
	if (serverSecs > 21600) {
		//restart server on next or same map depending on rotation
			exports.restartServer(
				serverName,
				_.get(exports, 'timerObj.curMap'),
				_.get(groupController, 'config.mapRotation')
			);
	} else {
		if (mesg) {
			DCSLuaCommands.sendMesgToAll(serverName, mesg, 20);
			mesg = null;
		}
	}
});

_.set(exports, 'restartServer', function (serverName, curMap, rotationObj) {
	var curMapIndex = _.findIndex(rotationObj, function(o) { return o === curMap; });
	if (!_.get(exports, 'timerObj.restart')) {
		if (rotationObj[curMapIndex+1]) {
			console.log('Loading Map: ', rotationObj[curMapIndex+1]);
			DCSLuaCommands.loadMission(serverName, rotationObj[curMapIndex+1]);
			_.set(exports, 'timerObj.curMap', rotationObj[curMapIndex+1]);
		} else {
			console.log('Loading Map: ', _.first(rotationObj));
			DCSLuaCommands.loadMission(serverName, _.first(rotationObj));
			_.set(exports, 'timerObj.curMap', _.first(rotationObj));
		}
		_.set(exports, 'timerObj.restart', true);
	}
});

_.set(exports, 'timeLeft', function (serverName, curUnit) {
	var formatTime = exports.secondsToHms(maxTime - curSecs);
	DCSLuaCommands.sendMesgToGroup(
		curUnit.groupId,
		serverName,
		"G: Server has " + formatTime + " left till restart!",
		5
	);
});

_.set(exports, 'secondsToHms', function (d) {
	d = Number(d);
	var h = Math.floor(d / 3600);
	var m = Math.floor(d % 3600 / 60);
	var s = Math.floor(d % 3600 % 60);

	var hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes") : "";
	// var sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
	return hDisplay + mDisplay;
});
