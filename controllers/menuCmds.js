const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const dbMapServiceController = require('./dbMapService');
const proximityController = require('./proximity');
const menuUpdateController = require('./menuUpdate');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (pObj) {
	console.log('process menu cmd: ', pObj);
	dbMapServiceController.unitActions('read', pObj.serverName, {_id: pObj.unitId})
		.then(function(units) {
			var spawnArray;
			var curSpawnUnit;
			var curUnit = _.get(units, 0, {});
			// action menu
			if (pObj.cmd === 'unloadExtractTroops') {
				if(curUnit.inAir) {
					DCSLuaCommands.sendMesgToGroup(
						curUnit.groupId,
						pObj.serverName,
						"G: Please Land Before Attempting Logistic Commands!",
						5
					);
				} else {
					if(exports.isTroopOnboard(curUnit, pObj.serverName)) {
						console.log('should be false: ', proximityController.extractUnitsBackToBase(curUnit, pObj.serverName) );
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
							curSpawnUnit = _.cloneDeep(_.first(groupController.getRndFromSpawnCat(curUnit.troopType, curUnit.coalition, true)));
							spawnArray = {
								spwnName: 'TU|' + pObj.unitId + '|' + curUnit.troopType + '|' + curUnit.playername + '|' ,
								type: curSpawnUnit.type,
								lonLatLoc: curUnit.lonLatLoc,
								heading: curUnit.hdg,
								country: curUnit.country,
								category: curSpawnUnit.category
							};
							groupController.spawnLogiGroup(pObj.serverName, [spawnArray], curUnit.coalition);
							dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: null});
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								pObj.serverName,
								"G: " + curSpawnUnit.type + " has been deployed!",
								5
							);
						}
					} else {
						//try to extract a troop
						proximityController.getTroopsInProximity(pObj.serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
							.then(function(units){
								var curTroop = _.get(units, [0]);
								if(curTroop) {
									// pickup troop
									dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: curTroop.spawnCat});
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
			}
			if (pObj.cmd === 'isTroopOnboard') {
				exports.isTroopOnboard(curUnit, pObj.serverName, true);
			}
			if (pObj.cmd === 'unpackCrate') {
				console.log('unpackCrate');
			}
			if (pObj.cmd === 'loadCrate') {
				proximityController.getCratesInProximity(pObj.serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
					.then(function(units){
						console.log('us: ', units);
						var curCrate = _.get(units, [0]);
						if(curCrate) {
							dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, virtCrateType: curCrate.name});
							groupController.destroyUnit(pObj.serverName, curCrate.name);
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								pObj.serverName,
								"G: Picked Up " + _.split(curCrate.name, '|')[2] + " Crate!",
								5
							);
						} else {
							// no troops
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								pObj.serverName,
								"G: No Crates To Load!",
								5
							);
						}
					})
					.catch(function (err) {
						console.log('line 32: ', err);
					})
				;
			}
			if (pObj.cmd === 'dropCrate') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, _.split(curUnit.virtCrateType, '|')[2], _.split(curUnit.virtCrateType, '|')[3]);
				dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, virtCrateType: null});
			}

			// Troop Menu
			if (pObj.cmd === 'Soldier') {
				exports.loadTroops(pObj.serverName, pObj.unitId, 'Soldier');
			}

			if (pObj.cmd === 'MG Soldier') {
				exports.loadTroops(pObj.serverName, pObj.unitId, 'MG Soldier');
			}

			if (pObj.cmd === 'MANPAD') {
				exports.loadTroops(pObj.serverName, pObj.unitId, 'MANPAD');
			}

			if (pObj.cmd === 'RPG') {
				exports.loadTroops(pObj.serverName, pObj.unitId, 'RPG');
			}

			if (pObj.cmd === 'Mortar Team') {
				exports.loadTroops(pObj.serverName, pObj.unitId, 'Mortar Team');
			}

			// Crate Menu ["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})
			if (pObj.cmd === 'EWR') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates);
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

_.set(exports, 'loadTroops', function(serverName, unitId, troopType) {
	dbMapServiceController.unitActions('update', serverName, {_id: unitId, troopType: troopType})
		.then(function(unit) {
			DCSLuaCommands.sendMesgToGroup(
				unit.groupId,
				serverName,
				"G: " + troopType + " Has Been Loaded!",
				5
			);
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

_.set(exports, 'spawnCrateFromLogi', function (serverName, unit, type, crates) {
	var crateStatic;
	var crateGroup;
	if(menuUpdateController.virtualCrates) {
		var spawnArray = {
			spwnName: 'CU|' + unit.unitId + '|' + type + '|' + crates + '|',
			type: "UAZ-469",
			lonLatLoc: unit.lonLatLoc,
			heading: unit.hdg,
			country: unit.country,
			isCrate: true,
			category: "GROUND"
		};
		groupController.spawnLogiGroup(serverName, [spawnArray], unit.coalition);
	} else {
		/*
		crateStatic = {

		};
		_crate = {
			["category"] = "Cargo",
			["shape_name"] = "iso_container_small_cargo",
			["type"] = "iso_container_small",
			["unitId"] = _unitId,
			["y"] = _point.z,
			["x"] = _point.x,
			["mass"] = _weight,
			["name"] = _name,
			["canCargo"] = true,
			["heading"] = 0
		}
		_crate["country"] = _country
		--env.info("info1: ctry: ".._crate["country"]..'unitId: '.._crate["unitId"]..' name: '.._crate["name"]..' category: '.._crate["category"]..' type: '.._crate["type"]..' mass '.._crate["mass"])
		mist.dynAddStatic(_crate)
		*/
	}
	DCSLuaCommands.sendMesgToGroup(
		unit.groupId,
		serverName,
		"G: " + type + " crate has been spawned!",
		5
	);
});
