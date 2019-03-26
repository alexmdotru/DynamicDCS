const	_ = require('lodash');
const constants = require('../../controllers/constants');
const masterDBController = require('../db/masterDB');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.set(exports, 'checkWeaponComplianceOnTakeoff', function (serverName, iPlayer, curIUnit) {
	// console.log('CWC: ', serverName, iPlayer, curIUnit);
    _.forEach(_.get(constants, 'config.weaponRules', []), function (weaponRule) {
		var limitedWeapons = [];
		var maxLimitedWeaponCount = 0;
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
	masterDBController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				masterDBController.srvPlayerActions('read', serverName, {sessionName: latestSession.name, playername: {$ne: ''}})
					.then(function(srvPlayers) {
						_.forEach(srvPlayers, function (curPlayer) {
							masterDBController.unitActions('read', serverName, {dead: false, playername: curPlayer.name})
								.then(function(cUnit) {
									if (cUnit.length > 0) {
										var curUnit = _.get(cUnit, [0]);
                                        _.forEach(_.get(constants, 'config.weaponRules', []), function (weaponRule) {
											var limitedWeapons = [];
											var maxLimitedWeaponCount = 0;
                                            _.forEach(_.get(curUnit, 'ammo', []), function (value) {
                                                let curTypeName = _.get(value, 'typeName');
                                                if(curTypeName) {
													masterDBController.weaponScoreActions('check', {
														typeName: curTypeName,
														unitType: _.get(curUnit, 'type')
													});
													if (_.includes(weaponRule.weapons, curTypeName)) {
														limitedWeapons.push(curTypeName);
														maxLimitedWeaponCount = maxLimitedWeaponCount + _.get(value, 'count');
													}
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
