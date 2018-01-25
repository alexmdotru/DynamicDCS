const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processEventEjection', function (serverName, sessionName, eventObj) {
	// Occurs when a pilot ejects from an aircraft
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
						msg: 'A: ' + constants.side[_.get(curIUnit, 'coalition')] + ' '+ _.get(curIUnit, 'type') + '('+ _.get(curIUnit, 'playername') +') ejected'
					};
					if(_.get(iCurObj, 'iucid')) {
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
			console.log('err line39: ', err);
		})
	;
});
