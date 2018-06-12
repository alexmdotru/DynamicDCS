const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');
const userLivesController = require('../../action/userLives');
const menuUpdateController = require('../../menu/menuUpdate');
const unitsStaticsController = require('../../serverToDbSync/unitsStatics');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processEventPlayerEnterUnit', function (serverName, sessionName, eventObj) {
	// Occurs when any player assumes direct control of a unit.
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
								displaySide: _.get(curIUnit, 'coalition'),
								roleCode: 'I',
								msg: 'C: '+ _.get(curIUnit, 'playername') +' enters a brand new ' + _.get(curIUnit, 'type')
							};
							if (_.get(iCurObj, 'iucid')) {
								webPushCommands.sendToCoalition(serverName, {payload: {action: eventObj.action, data: _.cloneDeep(iCurObj)}});
								dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
							}
							userLivesController.updateServerLives(serverName, curIUnit);
							// console.log('PLAYER ENTER UNIT', curIUnit);
							// menuUpdateController.logisticsMenu('resetMenu', serverName, curIUnit);
							/*
							DCSLuaCommands.sendMesgToCoalition(
								_.get(iCurObj, 'displaySide'),
								serverName,
								_.get(iCurObj, 'msg'),
								5
							);
							*/
						}
					}
				})
				.catch(function (err) {
					console.log('err line45: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('err line1509: ', err);
		})
	;
});
