const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const dbMapServiceController = require('./dbMapService');
const proximityController = require('./proximity');
const menuUpdateController = require('./menuUpdate');
const groupController = require('./group');

var maxCrates = 10;
var maxUnits = 10;

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
							dbMapServiceController.unitActions('read', pObj.serverName, {playerOwnerId: pObj.unitId, isTroop: true, dead: false})
								.then(function(delUnits){
									_.forEach(delUnits, function (unit) {
										dbMapServiceController.unitActions('update', pObj.serverName, {_id: unit.unitId, dead: true});
										groupController.destroyUnit(pObj.serverName, unit.name);
									});
									// spawn troop type
									curSpawnUnit = _.cloneDeep(_.first(groupController.getRndFromSpawnCat(curUnit.troopType, curUnit.coalition, true)));
									spawnArray = {
										spwnName: 'TU|' + pObj.unitId + '|' + curUnit.troopType + '|' + curUnit.playername + '|' ,
										type: curSpawnUnit.type,
										lonLatLoc: curUnit.lonLatLoc,
										heading: curUnit.hdg,
										country: curUnit.country,
										category: curSpawnUnit.category,
										playerCanDrive: false
									};
									groupController.spawnLogiGroup(pObj.serverName, [spawnArray], curUnit.coalition);
									dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: null})
										.catch(function (err) {
											console.log('erroring line73: ', err);
										})
									;
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										pObj.serverName,
										"G: " + curSpawnUnit.type + " has been deployed!",
										5
									);
								})
								.catch(function (err) {
									console.log('line 26: ', err);
								})
							;
						}
					} else {
						//try to extract a troop
						proximityController.getTroopsInProximity(pObj.serverName, curUnit.lonLatLoc, 0.2, curUnit.coalition)
							.then(function(units){
								var curTroop = _.get(units, [0]);
								if(curTroop) {
									// pickup troop
									dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, troopType: curTroop.spawnCat})
										.catch(function (err) {
											console.log('erroring line57: ', err);
										})
									;
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
								console.log('line114: ', err);
							})
						;
					}
				}
			}
			if (pObj.cmd === 'isTroopOnboard') {
				exports.isTroopOnboard(curUnit, pObj.serverName, true);
			}
			if (pObj.cmd === 'unpackCrate') {
				proximityController.getLogiTowersProximity(pObj.serverName, curUnit.lonLatLoc, 0.8)
					.then(function (logiProx) {
						if (logiProx.length) {
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								pObj.serverName,
								"G: You need to move farther away from Command Towers (800m)",
								5
							);
						} else {
							if(menuUpdateController.virtualCrates) {
								proximityController.getVirtualCratesInProximity(pObj.serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
									.then(function(units){
										var cCnt = 0;
										var grpTypes;
										var curCrate = _.get(units, [0], {});
										var numCrate = _.split(curCrate.name, '|')[3];
										var curCrateType = _.split(curCrate.name, '|')[2];
										var isCombo = (_.split(curCrate.name, '|')[4] === 'true');
										if(curCrate && curCrate.name) {
											//virtual sling loading
											grpTypes = _.transform(units, function (result, value) {
												(result[_.get(_.split(value.name, '|'), [2])] || (result[_.get(_.split(value.name, '|'), [2])] = [])).push(value);
											}, {});
											if( _.get(grpTypes, [curCrateType], []).length >=  numCrate) {
												cCnt = 1;
												_.forEach(_.get(grpTypes, [curCrateType]), function (eCrate) {
													if ( cCnt <= numCrate) {
														dbMapServiceController.unitActions('update', pObj.serverName, {_id: eCrate.unitId, dead: true})
															.catch(function (err) {
																console.log('erroring line152: ', err);
															})
														;
														groupController.destroyUnit(pObj.serverName, eCrate.name);
														cCnt ++;
													}
												});
												exports.unpackCrate(pObj.serverName, curUnit, curCrateType, isCombo);
												groupController.destroyUnit(pObj.serverName, curCrate.name);
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													pObj.serverName,
													"G: Unpacking " + curCrateType + "!",
													5
												);
											} else {
												DCSLuaCommands.sendMesgToGroup(
													curUnit.groupId,
													pObj.serverName,
													"G: Not Enough Crates for " + _.split(curCrate.name, '|')[2] + "!",
													5
												);
											}
										} else {
											// no troops
											DCSLuaCommands.sendMesgToGroup(
												curUnit.groupId,
												pObj.serverName,
												"G: No Crates To Unpack!",
												5
											);
										}
									})
									.catch(function (err) {
										console.log('line 32: ', err);
									})
								;
							} else {
								// real sling loading

							}
						}
					})
					.catch(function (err) {
						console.log('line 125: ', err);
					})
				;
			}
			if (pObj.cmd === 'loadCrate') {
				proximityController.getVirtualCratesInProximity(pObj.serverName, curUnit.lonLatLoc, 0.4, curUnit.coalition)
					.then(function(units){
						var curCrate = _.get(units, [0]);
						if(curCrate) {
							dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, virtCrateType: curCrate.name})
								.catch(function (err) {
									console.log('erroring line209: ', err);
								})
							;
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
				if (!_.isEmpty(curUnit.virtCrateType)) {
					exports.spawnCrateFromLogi(pObj.serverName, curUnit, _.split(curUnit.virtCrateType, '|')[2], _.split(curUnit.virtCrateType, '|')[3], (_.split(curUnit.virtCrateType, '|')[4] === 'true'));
					dbMapServiceController.unitActions('update', pObj.serverName, {_id: pObj.unitId, virtCrateType: null})
						.catch(function (err) {
							console.log('erroring line243: ', err);
						})
					;
				} else {
					DCSLuaCommands.sendMesgToGroup(
						curUnit.groupId,
						pObj.serverName,
						"G: You Have No Crates Onboard To Drop!",
						5
					);
				}
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
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'unarmedFuel') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'unarmedAmmo') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'armoredCar') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'APC') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'tank') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'artillary') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'mlrs') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'stationaryAntiAir') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'mobileAntiAir') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'samIR') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'mobileSAM') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, false);
			}

			if (pObj.cmd === 'MRSAM') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, true);
			}

			if (pObj.cmd === 'LRSAM') {
				exports.spawnCrateFromLogi(pObj.serverName, curUnit, pObj.type, pObj.crates, true);
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

_.set(exports, 'spawnCrateFromLogi', function (serverName, unit, type, crates, combo) {
	var crateCount = 0;
	dbMapServiceController.unitActions('read', serverName, {playerOwnerId: unit.unitId, isCrate: true, dead: false})
		.then(function(delCrates){
			_.forEach(delCrates, function (crate) {
				if(crateCount > maxCrates-1) {
					dbMapServiceController.unitActions('update', serverName, {_id: crate.unitId, dead: true})
						.catch(function (err) {
							console.log('erroring line387: ', err);
						})
					;
					groupController.destroyUnit(serverName, crate.name);
				}
				crateCount ++;
			});
			if(menuUpdateController.virtualCrates) {
				var spawnArray = {
					spwnName: 'CU|' + unit.unitId + '|' + type + '|' + crates + '|' + combo + '|',
					type: "UAZ-469",
					lonLatLoc: unit.lonLatLoc,
					heading: unit.hdg,
					country: unit.country,
					isCrate: true,
					category: "GROUND",
					playerCanDrive: false
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
		})
		.catch(function (err) {
			console.log('line 358: ', err);
		})
	;
});

_.set(exports, 'unpackCrate', function (serverName, unit, type, combo) {
	dbMapServiceController.unitActions('read', serverName, {playerOwnerId: unit.unitId, dead: false})
		.then(function(delUnits){
			var curUnit = 0;
			var grpGroups = _.transform(delUnits, function (result, value) {
				(result[value.groupId] || (result[value.groupId] = [])).push(value);
			}, {});
			var tRem = _.size(grpGroups) - maxUnits;
			_.forEach(grpGroups, function (gUnit) {
				if (curUnit <= tRem) {
					_.forEach(gUnit, function(unit) {
						dbMapServiceController.unitActions('update', serverName, {_id: unit.unitId, dead: true})
							.catch(function (err) {
								console.log('erroring line462: ', err);
							})
						;
						groupController.destroyUnit(serverName, unit.name);
					});
					curUnit++;
				}
			});
		})
		.catch(function (err) {
			console.log('line 390: ', err);
		})
	;
	var spawnArray = [];
	if(menuUpdateController.virtualCrates) {
		console.log('combo; ', combo);
		if (combo) {
			groupController.getUnitDictionary()
				.then(function (unitDic) {
					var addHdg = 0;
					var curUnitHdg;
					var findUnits = _.filter(unitDic, {comboName: type, enabled: true});
					_.forEach(findUnits, function (cbUnit) {
						curUnitHdg = unit.hdg + addHdg;
						if (curUnitHdg > 359) {
							curUnitHdg = 15;
						}
						_.set(cbUnit, 'spwnName', 'DU|' + unit.unitId + '|' + cbUnit.type + '|true|');
						_.set(cbUnit, 'lonLatLoc', unit.lonLatLoc);
						_.set(cbUnit, 'heading', curUnitHdg);
						_.set(cbUnit, 'country', unit.country);
						_.set(cbUnit, 'playerCanDrive', true);
						addHdg = addHdg + 15;
					});
					spawnArray = _.cloneDeep(findUnits);
					groupController.spawnLogiGroup(serverName, spawnArray, unit.coalition);
				})
				.catch(function (err) {
					console.log('line 394: ', err);
				})
			;
		} else {
			spawnArray = _.concat(spawnArray, {
				spwnName: 'DU|' + unit.unitId + '|' + type + '|false|',
				type: type,
				lonLatLoc: unit.lonLatLoc,
				heading: unit.hdg,
				country: unit.country,
				playerCanDrive: true,
				category: "GROUND"
			});
			console.log('sa: ', serverName, spawnArray, unit.coalition);
			groupController.spawnLogiGroup(serverName, spawnArray, unit.coalition);
		}
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
});
