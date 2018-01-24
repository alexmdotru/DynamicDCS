const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../dbMapService');
const DCSLuaCommands = require('../../DCSLuaCommands');
const playersEvent = require('../../events/backend/players');
const capLivesController = require('../../controllers/capLives');
const menuUpdateController = require('../../controllers/menuUpdate');

_.set(exports, 'processEventPlayerEnterUnit', function (serverName, sessionName, eventObj) {
	// Occurs when any player assumes direct control of a unit.
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
						displaySide: _.get(curIUnit, 'coalition'),
						roleCode: 'I',
						msg: 'C: '+ _.get(curIUnit, 'playername') +' enters a brand new ' + _.get(curIUnit, 'type')
					};
					if (_.get(iCurObj, 'iucid')) {
						// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
						dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
					}
					capLivesController.updateServerCapLives(serverName);
					menuUpdateController.logisticsMenu('resetMenu', serverName, curIUnit);
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
			console.log('err line1509: ', err);
		})
	;
});
