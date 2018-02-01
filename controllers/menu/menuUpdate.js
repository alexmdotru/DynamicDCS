const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const menuCmdsController = require('../menu/menuCmds'); //menuCmdsController.maxUnitsMoving
const capLivesController = require('../action/capLives');

exports.virtualCrates = true;
var enableAction = false;
var allowedTypesForTroops = [
	'UH-1H',
	'Mi-8MT',
	'SA342Mistral',
	'SA342M',
	'SA342L',
	'Bf-109K-4',
	'FW-190D9',
	'P-51D',
	'SpitfireLFMkIX',
	'TF-51D',
	'F-86F Sabre',
	'Hawk',
	'MiG-15bis',
	'L-39ZA',
	'L-39C',
	'C-101CC'
];
var allowedTypesForCrates = [
	'UH-1H',
	'Ka-50',
	'Mi-8MT'
];

var allowedTypesForModernCapLives = capLivesController.capLivesEnabled;

_.set(exports, 'logisticsMenu', function (action, serverName, unit) {
	dbMapServiceController.srvPlayerActions('read', serverName, {name: unit.playername})
		.then(function(player) {
			var curPlayer = _.get(player, [0]);
			if (curPlayer) {
				dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate:false, isTroop: false, dead: false})
					.then(function(unitsOwned){
						var isTroop = (_.find(unitsOwned, {isTroop: true})) ? 1 : 0;
						var grpGroups = _.transform(unitsOwned, function (result, value) {
							(result[value.groupId] || (result[value.groupId] = [])).push(value);
						}, {});

						var cmdArray = [];
						var troopsDeployed = '(' + isTroop + '/' + menuCmdsController.maxTroops + ')';
						var unitsBuilt = '(' + _.size(grpGroups) + '/' + menuCmdsController.maxUnitsMoving + ')';
						var trpMenuTitle = '"Troops' + troopsDeployed + '"';
						var aqMenuTitle = '"Acquisitions' + unitsBuilt + '"';
						var resetMenu = 'missionCommands.removeItemForGroup("' + unit.groupId + '", "ActionMenu", nil)';
						var actMenu = [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "ActionMenu")',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Is Troop Onboard", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "isTroopOnboard", ["unitId"] = ' + unit.unitId + '})',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Is A Crate Onboard", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "isCrateOnboard", ["unitId"] = ' + unit.unitId + '})'
						];
						var aTroopMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unload / Extract Troops", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["unitId"] = ' + unit.unitId + '})'
						];
						var aUnpackMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unpack Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unpackCrate", ["unitId"] = ' + unit.unitId + '})',
						];
						var vCrateMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["unitId"] = ' + unit.unitId + '})',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["unitId"] = ' + unit.unitId + '})',
						];
						var unitsProxBase = proximityController.extractUnitsBackToBase(unit, serverName);
						var logiFarpName = proximityController.unitInProxLogiTowers(unit, serverName);

						if(_.includes(allowedTypesForTroops, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aTroopMenu);
							enableAction = true;
						}
						if(_.includes(allowedTypesForCrates, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aUnpackMenu);
							enableAction = true;
						}
						if(exports.virtualCrates && _.includes(allowedTypesForCrates, unit.type)) {
							cmdArray = _.concat(cmdArray, vCrateMenu);
							enableAction = true;
						}
						if (enableAction) {
							cmdArray = _.concat(actMenu, cmdArray);
							enableAction = false;
						}
						cmdArray.unshift(resetMenu);

						// console.log('der: ', unit.type, _.includes(allowedTypesForTroops, unit.type), proximityController.extractUnitsBackToBase(unit, serverName));
						cmdArray = _.concat(cmdArray, [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Lives")',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Modern Cap Lives", {"Lives"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Lives", ["type"] = "Modern Lives", ["unitId"] = ' + unit.unitId + '})',
						]);
						if (_.includes(allowedTypesForTroops, unit.type) && unitsProxBase) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + trpMenuTitle + ')',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Rifle Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Soldier", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load MG Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MG Soldier", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load ManPad", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MANPAD", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load RPG Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "RPG", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Mortar Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Mortar Team", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',

							]);
						}
						if (_.includes(allowedTypesForCrates, unit.type) && logiFarpName) {
							if(unit.coalition === 1) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitle + ')',
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC (1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "SKP-11", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "ATZ-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "Ural-375", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Cobra(1M)", {' + aqMenuTitle + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "Cobra", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR-80(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR-80", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "MTLB(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "MTLB", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BRDM-2(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BRDM-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR_D(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR_D", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Boman(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Boman", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMD-1(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMD-1", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-2(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-60(2M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-60", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(2M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(3M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(3M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitle + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(2M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(2M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-1 9P31(2M)", {' + aqMenuTitle + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-1 9P31", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-10M3(2M)", {' + aqMenuTitle + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-10M3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Osa 9A33 ln(2M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Osa 9A33 ln", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3M)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(5S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "false"})',
								]);
								/*
                                            cmdArray = _.concat(cmdArray, [
                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Acquisitions(Stationary)")',
                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC (1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "SKP-11", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker (1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "ATZ-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck (1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "Ural-375", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Cobra (1S)", {"Acquisitions(Stationary)", "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "Cobra", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR-80(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR-80", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "MTLB(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "MTLB", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BRDM-2(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BRDM-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR_D(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR_D", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Boman(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Boman", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMD-1(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMD-1", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-2(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-60(2S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-60", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(2S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(3S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(3S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(4S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(4S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(4S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(2S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(2S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-10M3(2S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-10M3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-1 9P31(2S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-1 9P31", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Osa 9A33 ln(2S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Osa 9A33 ln", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',
                                                // 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(5S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "false"})',
                                            ]);
                                */
							}

							if(unit.coalition === 2) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitle + ')',
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "Hummer", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "M978 HEMTT Tanker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck(1M)", {' + aqMenuTitle + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "M 818", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee TOW(1M)", {' + aqMenuTitle + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1045 HMMWV TOW", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee MGS(1M)", {' + aqMenuTitle + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1043 HMMWV Armament", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Marder(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Marder", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "TPZ(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "TPZ", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "AAV7(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "AAV7", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-113(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-113", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "LAV-25(1M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "LAV-25", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ICV(2M)", {' + aqMenuTitle + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1126 Stryker ICV", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(2M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(4M)", {' + aqMenuTitle + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan_BM-27(1M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitle + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitle + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(2M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3M)", {' + aqMenuTitle + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Avenger(2M)", {' + aqMenuTitle + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M1097 Avenger", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Chaparral(2M)", {' + aqMenuTitle + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M48 Chaparral", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Linebacker(2M)", {' + aqMenuTitle + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M6 Linebacker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitle + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4M)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mobile"] = "true"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(5)", {' + aqMenuTitle + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "true"})',
								]);
								/*
                                            cmdArray = _.concat(cmdArray, [
                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Acquisitions(Stationary)")',
                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC (1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "Hummer", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker(1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "M978 HEMTT Tanker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck(1S)", {"Acquisitions(Stationary)","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "M 818", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee TOW(1S)", {"Acquisitions(Stationary)", "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1045 HMMWV TOW", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee MGS(1S)", {"Acquisitions(Stationary)", "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1043 HMMWV Armament", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Marder(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Marder", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "TPZ(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "TPZ", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "AAV7(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "AAV7", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-113(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-113", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "LAV-25(1S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "LAV-25", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ICV(2S)", {"Acquisitions(Stationary)", "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1126 Stryker ICV", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(2S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(4S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(4S)", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(4S", {"Acquisitions(Stationary)", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan_BM-27(1S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2S)", {"Acquisitions(Stationary)", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(2S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3S)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Avenger(1S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M1097 Avenger", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Chaparral(2S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M48 Chaparral", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Linebacker(2S)", {"Acquisitions(Stationary)", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M6 Linebacker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "false"})',

                                                'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {"Acquisitions(Stationary)"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3S", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false"})',
                                                'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4S)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mobile"] = "false"})',
                                                // 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(5)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "false"})',
                                            ]);
                                */
							}
						}

						// console.log('cmd: ', cmdArray);
						var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
						var actionObj = {actionObj: sendClient, queName: 'clientArray'};
						dbMapServiceController.cmdQueActions('save', serverName, actionObj)
							.catch(function (err) {
								console.log('erroring line208: ', err);
							})
						;
					})
					.catch(function (err) {
						console.log('line :256', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line :256', err);
		})
	;
});
