const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');
const unitsStaticsController = require('../../serverToDbSync/unitsStatics');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processEventPlayerLeaveUnit', function (serverName, sessionName, eventObj) {
	// Occurs when any player relieves control of a unit to the AI.
	dbMapServiceController.unitActions('read', serverName, {unitId: _.get(eventObj, ['data', 'arg3'])})
		.then(function (iunit) {
			dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: sessionName})
				.then(function (playerArray) {
					var iPlayer;
					var iCurObj;
					var curIUnit = _.get(iunit, 0);
					if (curIUnit) {

						unitsStaticsController.processUnitUpdates(serverName, sessionName, {action: 'D', data: {name: curIUnit.name}});

						iPlayer = _.find(playerArray, {name: _.get(curIUnit, 'playername')});
						if (iPlayer) {
							iCurObj = {
								sessionName: sessionName,
								eventCode: constants.shortNames[eventObj.action],
								iucid: _.get(iPlayer, 'ucid'),
								iName: _.get(curIUnit, 'playername'),
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') +' leaves his ' + _.get(curIUnit, 'type')
							};
							if (_.get(iCurObj, 'iucid')) {
								webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
								dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
							}
							DCSLuaCommands.sendMesgToCoalition(
								_.get(iCurObj, 'displaySide'),
								serverName,
								_.get(iCurObj, 'msg'),
								5
							);
						}
					}
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line40: ', err);
		})
	;
});
