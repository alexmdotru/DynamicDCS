const	_ = require('lodash');
const constants = require('../constants');
const DCSLuaCommands = require('../player/DCSLuaCommands');

var cntr = 10;
var curSecs = 0;
var maxTime = _.get(constants, 'config.restartTime');
var mesg;
var oneHour = _.get(constants, 'time.oneHour');

_.set(exports, 'timerObj', {});

//only 5 hour rotation allowed atm
_.set(exports, 'processTimer', function (serverName, serverSecs) {
	mesg = null;
	curSecs = serverSecs;
	//5 hours
	// if (serverSecs > 3600 && !_.get(exports, 'timerObj.fiveHours')) {
	//	mesg = 'Server is restarting in 5 hours!';
	//	_.set(exports, 'timerObj.fiveHours', true)
	// }
	//4 hours
	if (serverSecs > (maxTime - (oneHour * 4)) && !_.get(exports, 'timerObj.fourHours')) {
		mesg = 'Server is restarting in 4 hours!';
		_.set(exports, 'timerObj.fourHours', true)
	}
	//3 hours
	if (serverSecs > (maxTime - (oneHour * 3)) && !_.get(exports, 'timerObj.threeHours')) {
		mesg = 'Server is restarting in 3 hours!';
		_.set(exports, 'timerObj.threeHours', true)
	}
	//2 hours
	if (serverSecs > (maxTime - (oneHour * 2)) && !_.get(exports, 'timerObj.twoHours')) {
		mesg = 'Server is restarting in 2 hours!';
		_.set(exports, 'timerObj.twoHours', true)
	}
	//1 hour
	if (serverSecs > (maxTime - oneHour) && !_.get(exports, 'timerObj.oneHour')) {
		mesg = 'Server is restarting in 1 hour!';
		_.set(exports, 'timerObj.oneHour', true)
	}
	//30 mins
	if (serverSecs > (maxTime - 1800) && !_.get(exports, 'timerObj.thirtyMinutes')) {
		mesg = 'Server is restarting in 30 minutes!';
		_.set(exports, 'timerObj.thirtyMinutes', true)
	}
	//20 mins
	if (serverSecs > (maxTime - 1440) && !_.get(exports, 'timerObj.twentyMinutes')) {
		mesg = 'Server is restarting in 20 mins!';
		_.set(exports, 'timerObj.twentyMinutes', true)
	}
	//10 mins
	if (serverSecs > (maxTime - 720) && !_.get(exports, 'timerObj.tenMinutes')) {
		mesg = 'Server is restarting in 10 mins!';
		_.set(exports, 'timerObj.tenMinutes', true)
	}
	//5 mins
	if (serverSecs > (maxTime - 360) && !_.get(exports, 'timerObj.fiveMinutes')) {
		mesg = 'Server is restarting in 5 minutes!';
		_.set(exports, 'timerObj.fiveMinutes', true)
	}
	//4 mins
	if (serverSecs > (maxTime - 240) && !_.get(exports, 'timerObj.fourMinutes')) {
		mesg = 'Server is restarting in 4 minutes!';
		_.set(exports, 'timerObj.fourMinutes', true)
	}
	//3 mins
	if (serverSecs > (maxTime - 180) && !_.get(exports, 'timerObj.threeMinutes')) {
		mesg = 'Server is restarting in 3 minutes!';
		_.set(exports, 'timerObj.threeMinutes', true)
	}
	//2 mins
	if (serverSecs > (maxTime - 120) && !_.get(exports, 'timerObj.twoMinutes')) {
		mesg = 'Server is restarting in 2 minutes!';
		_.set(exports, 'timerObj.twoMinutes', true)
	}
	//1 min
	if (serverSecs > (maxTime - 60) && !_.get(exports, 'timerObj.oneMinute')) {
		mesg = 'Server is restarting in 1 minute!';
		_.set(exports, 'timerObj.oneMinute', true)
	}
	//restart server
	if (serverSecs > maxTime) {
		//restart server on next or same map depending on rotation
			exports.restartServer(
				serverName,
				_.get(exports, 'timerObj.curMap'),
				_.get(constants, 'config.mapRotation')
			);
	} else {
		if (mesg) {
			console.log('serverMesg: ', serverName, mesg);
			DCSLuaCommands.sendMesgToAll(serverName, mesg, 20);
		}
	}
});

_.set(exports, 'resetTimerObj', function () {
	_.set(exports, 'timerObj', {});
});

_.set(exports, 'restartServer', function (serverName, curMap, rotationObj) {
	var curMapIndex = _.findIndex(rotationObj, function(o) { return o === curMap; });
	if (cntr === 10) {
        if (rotationObj[curMapIndex+1]) {
            console.log('Loading Map: ', rotationObj[curMapIndex+1]);
            DCSLuaCommands.loadMission(serverName, rotationObj[curMapIndex+1]);
            _.set(exports, 'timerObj.curMap', rotationObj[curMapIndex+1]);
        } else {
            console.log('Loading Map: ', _.first(rotationObj));
            DCSLuaCommands.loadMission(serverName, _.first(rotationObj));
            _.set(exports, 'timerObj.curMap', _.first(rotationObj));
        }
        cntr = 0;
	} else {
        cntr++;
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
