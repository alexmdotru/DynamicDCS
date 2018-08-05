const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');

var weaponRules = {
	longRangeMissles: {
		limitedMissles: [
			"AIM-120B",
			"AIM-120C",
			"R-27ET",
			"R-27ER",
			"R-77"
		],
		maxTotalAllowed: _.get(groupController, 'config.maxLngRngA2A', 0)
	}
};

console.log('WR: ', weaponRules, groupController.config);

//var oneHour = 600 * 1000;
// updateServerLives
_.set(exports, 'checkWeaponComplianceOnTakeoff', function (serverName, iPlayer, curIUnit) {
	// console.log('CWC: ', serverName, iPlayer, curIUnit);
	var limitedWeapons = [];
	var maxLimitedWeaponCount = 0;
	_.forEach(_.get(curIUnit, 'ammo', []), function (value) {
		var curTypeName = value.typeName;
		if (_.includes(_.get(weaponRules, 'longRangeMissles.limitedMissles', []), curTypeName)) {
			limitedWeapons.push(curTypeName);
			maxLimitedWeaponCount = maxLimitedWeaponCount + value.count;
		}
	});
	if (maxLimitedWeaponCount > _.get(weaponRules, 'longRangeMissles.maxTotalAllowed', 0)) {
		var msg = 'Removed from aircraft not complying with weapon restrictions, (' + maxLimitedWeaponCount + ' of ' + _.join(limitedWeapons) + ')';
		console.log('Removed ' + iPlayer.name + ' from aircraft not complying with weapon restrictions, (' + maxLimitedWeaponCount + ' of ' + _.join(limitedWeapons) + ')');
		DCSLuaCommands.forcePlayerSpectator(
			serverName,
			iPlayer.playerId,
			msg
		);
		return false;
	}
	return true;
});

_.set(exports, 'checkAircraftWeaponCompliance', function (serverName) {
	dbMapServiceController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: latestSession.name, playername: {$ne: ''}})
					.then(function(srvPlayers) {
						_.forEach(srvPlayers, function (curPlayer) {
							dbMapServiceController.unitActions('read', serverName, {dead: false, playername: curPlayer.name})
								.then(function(cUnit) {
									if (cUnit.length > 0) {
										var curUnit = _.get(cUnit, [0]);
										var limitedWeapons = [];
										var maxLimitedWeaponCount = 0;
										_.forEach(_.get(curUnit, 'ammo', []), function (value) {
											var curTypeName = value.typeName;
											if (_.includes(_.get(weaponRules, 'longRangeMissles.limitedMissles', []), curTypeName)) {
												limitedWeapons.push(curTypeName);
												maxLimitedWeaponCount = maxLimitedWeaponCount + value.count;
											}
										});
										if (maxLimitedWeaponCount > _.get(weaponRules, 'longRangeMissles.maxTotalAllowed', 0) && !_.get(curUnit, 'inAir', false)) {
											DCSLuaCommands.sendMesgToGroup(
												curUnit.groupId,
												serverName,
												"G: You have too many combined long range A2A Missles(" + maxLimitedWeaponCount + " of " + _.join(limitedWeapons) + "), Max Allowed " + _.get(weaponRules, 'longRangeMissles.maxTotalAllowed', 0),
												30
											);
										}
									}
								})
								.catch(function (err) {
									console.log('line161', err);
								})
							;
						});
					})
					.catch(function (err) {
						console.log('line168', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line180', err);
		})
	;
});
