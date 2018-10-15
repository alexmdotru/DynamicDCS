const	_ = require('lodash');
const constants = require('../../controllers/constants');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

//var oneHour = 600 * 1000;
// updateServerLives
/*
	//HC server rules
	"weaponRules": [
		{
			"desc": 'limited AA',
			"maxTotalAllowed": NumberInt(2),
			"weapons": [
				"AIM-120B",
				"AIM-120C",
				"R-27ET",
				"R-27ER",
				"R-77"
			]
		},
		{
			"desc": 'banned',
			"maxTotalAllowed": NumberInt(0),
			"weapons": [
				"weapons.bombs.RN-24",
				"weapons.bombs.RN-28"
			]
		}
	]
	//Standard server rules
	"weaponRules": [
		{
			"desc": 'banned',
			"maxTotalAllowed": NumberInt(0),
			"weapons": [
				"AIM-120B",
            	"AIM-120C",
            	"R-27ET",
            	"R-27ER",
            	"R-77",
            	"weapons.missiles.X_58",
 				"weapons.bombs.RN-24",
 				"weapons.bombs.RN-28",
			]
		}
	]
*/

_.set(exports, 'checkWeaponComplianceOnTakeoff', function (serverName, iPlayer, curIUnit) {
	// console.log('CWC: ', serverName, iPlayer, curIUnit);
	var limitedWeapons = [];
	var maxLimitedWeaponCount = 0;
    _.forEach(_.get(constants, 'config.weaponRules', []), function (weaponRule) {
        _.forEach(_.get(curIUnit, 'ammo', []), function (value) {
            var curTypeName = value.typeName;
            if (_.includes(weaponRule.weapons, curTypeName)) {
                limitedWeapons.push(curTypeName);
                maxLimitedWeaponCount = maxLimitedWeaponCount + value.count;
            }
        });
        if (maxLimitedWeaponCount > weaponRule.maxTotalAllowed) {
            var msg = 'Removed from aircraft not complying with weapon restrictions, (' + maxLimitedWeaponCount + ' of ' + _.join(limitedWeapons) + ')';
            console.log('Removed ' + iPlayer.name + ' from aircraft not complying with weapon restrictions, (' + maxLimitedWeaponCount + ' of ' + _.join(limitedWeapons) + ')');
            DCSLuaCommands.forcePlayerSpectator(
                serverName,
                iPlayer.playerId,
                msg
            );
            return false;
        }
	});
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
                                        _.forEach(_.get(constants, 'config.weaponRules', []), function (weaponRule) {
                                            _.forEach(_.get(curUnit, 'ammo', []), function (value) {
                                                var curTypeName = value.typeName;
                                                if (_.includes(weaponRule.weapons, curTypeName)) {
                                                    limitedWeapons.push(curTypeName);
                                                    maxLimitedWeaponCount = maxLimitedWeaponCount + value.count;
                                                }
                                            });
                                            if (maxLimitedWeaponCount > weaponRule.maxTotalAllowed && !_.get(curUnit, 'inAir', false)) {
                                                DCSLuaCommands.sendMesgToGroup(
                                                    curUnit.groupId,
                                                    serverName,
                                                    "G: You have too many/banned weapons(" + maxLimitedWeaponCount + " of " + _.join(limitedWeapons) + "), Max Allowed " + weaponRule.maxTotalAllowed,
                                                    30
                                                );
                                            }
										});
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
