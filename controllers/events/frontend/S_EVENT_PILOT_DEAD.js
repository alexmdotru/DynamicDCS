const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processEventPilotDead', function (serverName, sessionName, eventObj) {
	// Occurs when the pilot of an aircraft is killed.
	// Can occur either if the player is alive and crashes or
	// if a weapon kills the pilot without completely destroying the plane.
	dbMapServiceController.unitActions('read', serverName, {_id: _.get(eventObj, ['data', 'arg3'])})
		.then(function (iunit) {
			var iPlayer;
			var iCurObj;
			var curIUnit = _.get(iunit, 0);
			if (curIUnit) {
				iPlayer = _.find(playersEvent.rtPlayerArray[serverName], {name: _.get(curIUnit, 'playername')});
				if (iPlayer) {
					iCurObj = {
						sessionName: sessionName,
						eventCode: constants.shortNames[eventObj.action],
						iucid: _.get(iPlayer, 'ucid'),
						iName: _.get(curIUnit, 'playername'),
						displaySide: 'A',
						roleCode: 'I',
						msg: 'A: ' + constants.side[_.get(curIUnit, 'coalition')] + ' '+ _.get(curIUnit, 'type') + '('+ _.get(curIUnit, 'playername') +') pilot is dead'
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					DCSLuaCommands.sendMesgToAll(
						serverName,
						_.get(iCurObj, 'msg'),
						5
					);
				}
			}
		})
		.catch(function (err) {
			console.log('err line41: ', err);
		})
	;
});
