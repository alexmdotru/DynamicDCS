const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processEventPilotDead', function (serverName, sessionName, eventObj) {
	// Occurs when the pilot of an aircraft is killed.
	// Can occur either if the player is alive and crashes or
	// if a weapon kills the pilot without completely destroying the plane.
	dbMapServiceController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3'])})
		.then(function (iunit) {
			dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: sessionName})
				.then(function (playerArray) {
					var iPlayer;
					var iCurObj;
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {
						iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: constants.shortNames[eventObj.action],
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: 'A',
								roleCode: 'I',
								msg: 'A: ' + constants.side[_.get(curIUnit, 'coalition')] + ' '+ _.get(curIUnit, 'type') + '('+ _.get(curIUnit, 'playername') +') pilot is dead',
								groupId: _.get(curIUnit, 'groupId')
							};
							if (_.get(iCurObj, 'iucid')) {
								webPushCommands.sendToAll(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
								dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
							}
							dbMapServiceController.srvPlayerActions('clearTempScore', serverName, {_id: _.get(iCurObj, 'iucid'), groupId: _.get(iCurObj, 'groupId')})
								.catch(function (err) {
									console.log('line35', err);
								})
							;

							if (_.get(constants, 'config.inGameHitMessages', true)) {
								DCSLuaCommands.sendMesgToAll(
									serverName,
									_.get(iCurObj, 'msg'),
									5
								);
							}
						}
					}
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line41: ', err);
		})
	;
});
