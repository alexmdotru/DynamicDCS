const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const playersEvent = require('../../events/backend/players');

_.set(exports, 'processEventTakeoff', function (serverName, sessionName, eventObj) {
	var place;
	// Occurs when an aircraft takes off from an airbase, farp, or ship.
	if (_.get(eventObj, 'data.arg6')){
		place = ' from '+_.get(eventObj, 'data.arg6');
	} else if (_.get(eventObj, 'data.arg5')) {
		place = ' from '+_.get(eventObj, 'data.arg5');
	} else {
		place = '';
	}

	dbMapServiceController.unitActions('read', serverName, {_id: _.get(eventObj, ['data', 'arg3'])})
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
								msg: 'C: '+ _.get(curIUnit, 'type') + '('+_.get(curIUnit, 'playername')+') has taken off' + place
							};
							if(_.get(iCurObj, 'iucid')) {
								// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
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
			console.log('err line49: ', err);
		})
	;
});
