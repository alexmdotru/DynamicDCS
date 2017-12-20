const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const dbMapServiceController = require('./dbMapService');
const proximityController = require('./proximity');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (pObj) {
	console.log('process menu cmd: ', pObj);
	dbMapServiceController.unitActions('read', pObj.serverName, {_id: pObj.unitId})
		.then(function(units) {
			var curUnit = _.get(units, 0, {});
			// action menu
			if (pObj.cmd === 'unloadExtractTroops') {
				if(exports.isTroopOnboard(curUnit, pObj.serverName)) {
					if(proximityController.extractUnitsBackToBase(curUnit, pObj.serverName)) {
						dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: null})
							.then(function(){
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									pObj.serverName,
									"G: " + curUnit.troopType + " has been dropped off at the base!",
									5
								);
							})
							.catch(function (err) {
								console.log('line 26: ', err);
							})
						;
					} else {
						// spawn troop type
						dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: null});
						console.log('spawning stuff');
					}
				} else {
					//try to extract a troop
					console.log('try to extract');
					proximityController.getTroopsInProximity(pObj.serverName, curUnit.lonLatLoc, 0.2, false, curUnit.coalition)
						.then(function(units){
							var curTroop = _.get(units, [0]);
							if(curTroop) {
								// pickup troop
								dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: curTroop.type});
								groupController.destroyUnit(pObj.serverName, curTroop.name);
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									pObj.serverName,
									"G: Picked Up " + curTroop.type + "!",
									5
								);
							} else {
								// no troops
								DCSLuaCommands.sendMesgToGroup(
									curUnit.groupId,
									pObj.serverName,
									"G: No Troops To Extract Or Unload!",
									5
								);
							}
						})
						.catch(function (err) {
							console.log('line 32: ', err);
						})
					;
				}
			}
			if (pObj.cmd === 'isTroopOnboard') {
				exports.isTroopOnboard(curUnit, pObj.serverName, true);
			}
			if (pObj.cmd === 'unpackCrate') {
				console.log('unpackCrate');
			}
			if (pObj.cmd === 'loadCrate') {
				console.log('loadCrate');
			}
			if (pObj.cmd === 'dropCrate') {
				console.log('dropCrate');
			}

			// Troop Menu
			if (pObj.cmd === 'soldier') {

				console.log('soldier');
			}

			if (pObj.cmd === 'MGSoldier') {
				console.log('MGSoldier');
			}

			if (pObj.cmd === 'manpad') {
				console.log('manpad');
			}

			if (pObj.cmd === 'RPG') {
				console.log('RPG');
			}

			if (pObj.cmd === 'mortar') {
				console.log('mortar');
			}

			// Crate Menu
			if (pObj.cmd === 'EWR') {
				console.log('EWR');
			}

			if (pObj.cmd === 'unarmedFuel') {
				console.log('unarmedFuel');
			}

			if (pObj.cmd === 'unarmedAmmo') {
				console.log('unarmedAmmo');
			}

			if (pObj.cmd === 'armoredCar') {
				console.log('armoredCar');
			}

			if (pObj.cmd === 'APC') {
				console.log('APC');
			}

			if (pObj.cmd === 'tank') {
				console.log('tank');
			}

			if (pObj.cmd === 'artillary') {
				console.log('artillary');
			}

			if (pObj.cmd === 'mlrs') {
				console.log('mlrs');
			}

			if (pObj.cmd === 'stationaryAntiAir') {
				console.log('stationaryAntiAir');
			}

			if (pObj.cmd === 'mobileAntiAir') {
				console.log('mobileAntiAir');
			}

			if (pObj.cmd === 'samIR') {
				console.log('samIR');
			}

			if (pObj.cmd === 'mobileSAM') {
				console.log('mobileSAM');
			}

			if (pObj.cmd === 'MRSAM') {
				console.log('MRSAM');
			}

			if (pObj.cmd === 'LRSAM') {
				console.log('LRSAM');
			}
		})
		.catch(function (err) {
			console.log('line 13: ', err);
		})
	;
});

_.set(exports, 'isTroopOnboard', function (unit, serverName, verbose) {
	if (!_.isEmpty(unit.troopType)) {
		if(verbose) {
			DCSLuaCommands.sendMesgToGroup(
				unit.groupId,
				serverName,
				"G: " + unit.troopType + " is Onboard!",
				5
			);
		}
		return true;
	}
	if(verbose) {
		DCSLuaCommands.sendMesgToGroup(
			unit.groupId,
			serverName,
			"G: No Troops Onboard!",
			5
		);
	}
	return false
});
