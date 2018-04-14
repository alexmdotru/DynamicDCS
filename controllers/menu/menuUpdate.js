const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const menuCmdsController = require('../menu/menuCmds'); //menuCmdsController.maxUnitsMoving
const userLivesController = require('../action/userLives');

exports.virtualCrates = false;
var enableAction = false;
var allowedHelisForTroops = [
	'UH-1H',
	'Mi-8MT',
	'SA342Mistral',
	'SA342M',
	'SA342L'
];
var allowedPlanesForTroops = [
	'TF-51D',
	'F-86F Sabre',
	'MiG-15bis',
	'L-39ZA'
];
var allowedTypesForCratesLight = [
	'UH-1H',
	'Ka-50'
];

var allowedTypesForCratesHeavy = [
	'Mi-8MT'
];

var allowedTypesForModernCapLives = userLivesController.capLivesEnabled;
var allowedTypesForModernCasLives = userLivesController.casLivesEnabled;

_.set(exports, 'logisticsMenu', function (action, serverName, unit) {
	console.log('logiCall');
	dbMapServiceController.srvPlayerActions('read', serverName, {name: unit.playername})
		.then(function(player) {
			var curPlayer = _.get(player, [0]);
			if (curPlayer) {
				dbMapServiceController.unitActions('read', serverName, {playerOwnerId: curPlayer.ucid, isCrate:false, isTroop: false, dead: false})
					.then(function(unitsOwned){
						var isTroop = (_.find(unitsOwned, {isTroop: true})) ? 1 : 0;
						var grpGroups = _.transform(unitsOwned, function (result, value) {
							(result[value.groupName] || (result[value.groupName] = [])).push(value);
						}, {});

						var cmdArray = [];
						var troopsDeployed = '(' + isTroop + '/' + menuCmdsController.maxTroops + ')';
						var unitsBuilt = '(' + _.size(grpGroups) + '/' + menuCmdsController.maxUnitsMoving + ')';
						var trpMenuTitle = '"Troops' + troopsDeployed + '"';
						var aqMenuTitleLite = '"Acquisitions Light' + unitsBuilt + '"';
						var aqMenuTitleHeavy = '"Acquisitions Heavy' + unitsBuilt + '"';
						var resetMenu = 'missionCommands.removeItemForGroup("' + unit.groupId + '", "ActionMenu", nil)';
						var actMenu = [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "ActionMenu")',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Is Troop Onboard", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "isTroopOnboard", ["unitId"] = ' + unit.unitId + '})'
						];
						var aTroopMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unload / Extract Troops", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["unitId"] = ' + unit.unitId + '})'
						];
						var aUnpackMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unpack Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unpackCrate", ["unitId"] = ' + unit.unitId + '})',
						];
						var vCrateMenu = [
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Is A Crate Onboard", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "isCrateOnboard", ["unitId"] = ' + unit.unitId + '})',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["unitId"] = ' + unit.unitId + '})',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["unitId"] = ' + unit.unitId + '})',
						];
						var unitsProxBase = proximityController.extractUnitsBackToBase(unit, serverName);
						var logiFarpName = proximityController.unitInProxLogiTowers(unit, serverName);

						if(_.includes(allowedHelisForTroops, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aTroopMenu);
							enableAction = true;
						}
						if(_.includes(allowedPlanesForTroops, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aTroopMenu);
							enableAction = true;
						}
						if(_.includes(allowedTypesForCratesLight, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aUnpackMenu);
							enableAction = true;
						}
						if(_.includes(allowedTypesForCratesHeavy, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aUnpackMenu);
							enableAction = true;
						}
						if(exports.virtualCrates && _.includes(allowedTypesForCratesLight, unit.type)) {
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
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Modern CAP Lives", {"Lives"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "checkCapLives", ["type"] = "Modern CAP Lives", ["unitId"] = ' + unit.unitId + '})',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Modern CAS Lives", {"Lives"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "checkCasLives", ["type"] = "Modern CAS Lives", ["unitId"] = ' + unit.unitId + '})',
						]);
						if (_.includes(allowedHelisForTroops, unit.type) && unitsProxBase) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + trpMenuTitle + ')',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Rifle Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Soldier", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load MG Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MG Soldier", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load ManPad", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MANPAD", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load RPG Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "RPG", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Mortar Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Mortar Team", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})',
							]);
						}
						if (_.includes(allowedPlanesForTroops, unit.type) && unitsProxBase) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + trpMenuTitle + ')',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Rifle Troop", {' + trpMenuTitle + '}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "Soldier", ["type"] = "combo", ["unitId"] = ' + unit.unitId + '})'
							]);
						}
						if (_.includes(allowedTypesForCratesLight, unit.type) && logiFarpName) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleLite + ')',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleLite + '})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "500"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "501"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "502"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian JTAC (1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "Hummer", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "503"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA JTAC (1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "UAZ-469", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "503"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "504"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "505"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian Fuel Tanker(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "ATZ-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "506"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian Ammo Truck(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "Ural-375", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "507"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA Fuel Tanker(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "M978 HEMTT Tanker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "506"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA Ammo Truck(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "M 818", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "507"})',


								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Cobra(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "Cobra", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "508"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee TOW(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1045 HMMWV TOW", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "509"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee MGS(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1043 HMMWV Armament", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "510"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs-1", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR-80(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR-80", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "511"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "MTLB(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "MTLB", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "513"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BRDM-2(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BRDM-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "515"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR_D(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR_D", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "517"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Boman(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Boman", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "519"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMD-1(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMD-1", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "521"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-2(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "523"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(1M)", {' + aqMenuTitleLite + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "525"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs-2", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Marder(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Marder", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "512"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "TPZ(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "TPZ", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "514"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "AAV7(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "AAV7", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "516"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-113(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-113", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "518"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "LAV-25(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "LAV-25", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "520"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "522"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "524"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "526"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ICV(1M)", {' + aqMenuTitleLite + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1126 Stryker ICV", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "527"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "529"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "530"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "531"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "532"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "533"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "535"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "537"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "534"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "536"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "538"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "540"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "539"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "541"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "542"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "543"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "545"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "544"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "546"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "547"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "548"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "549"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "550"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "551"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "552"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(2M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "553"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-1 9P31(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-1 9P31", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "554"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-10M3(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-10M3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "556"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Avenger(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M1097 Avenger", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "555"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Chaparral(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M48 Chaparral", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "557"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Linebacker(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M6 Linebacker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "558"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleLite + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Osa 9A33 ln(1M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Osa 9A33 ln", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "559"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(2M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "560"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(2M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "561"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "562"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(2M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "563"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(2M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "564"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "565"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(6M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 6, ["mobile"] = "false", ["mass"] = "566"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(6M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 6, ["mobile"] = "true", ["mass"] = "567"})',
							]);
						}

						if (_.includes(allowedTypesForCratesHeavy, unit.type) && logiFarpName) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleHeavy + ')',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleHeavy + '})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1400"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1401"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1402"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian JTAC (1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "Hummer", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1403"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA JTAC (1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "UAZ-469", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1404"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1404"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1405"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian Fuel Tanker(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "ATZ-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1406"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Russian Ammo Truck(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "Ural-375", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1407"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA Fuel Tanker(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "M978 HEMTT Tanker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1406"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "USA Ammo Truck(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "M 818", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1407"})',


								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Cobra(1M)", {' + aqMenuTitleHeavy + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "Cobra", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1408"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee TOW(1M)", {' + aqMenuTitleHeavy + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1045 HMMWV TOW", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1409"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee MGS(1M)", {' + aqMenuTitleHeavy + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1043 HMMWV Armament", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1410"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs-1", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR-80(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR-80", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1411"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "MTLB(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "MTLB", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1413"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BRDM-2(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BRDM-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1415"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR_D(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR_D", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1417"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Boman(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Boman", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1419"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMD-1(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMD-1", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1421"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-2(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1423"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(1M)", {' + aqMenuTitleHeavy + ', "IFVs-1"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1425"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs-2", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Marder(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Marder", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1412"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "TPZ(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "TPZ", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1414"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "AAV7(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "AAV7", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1416"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-113(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-113", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1418"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "LAV-214(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "LAV-25", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1420"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1422"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1424"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1426"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ICV(1M)", {' + aqMenuTitleHeavy + ', "IFVs-2"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1126 Stryker ICV", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1427"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleHeavy + '})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-60(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-60", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1428"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1429"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1430"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1431"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1432"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1433"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1435"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1437"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1434"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1436"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(3M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1438"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1440"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1439"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1441"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1442"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1443"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1445"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1444"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1446"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1447"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1448"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1449"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1450"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1451"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1452"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(2M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1453"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-1 9P31(2M)", {' + aqMenuTitleHeavy + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-1 9P31", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1454"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-10M3(2M)", {' + aqMenuTitleHeavy + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-10M3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1456"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Avenger(2M)", {' + aqMenuTitleHeavy + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M1097 Avenger", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1455"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Chaparral(2M)", {' + aqMenuTitleHeavy + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M48 Chaparral", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1457"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Linebacker(2M)", {' + aqMenuTitleHeavy + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M6 Linebacker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1458"})',

								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleHeavy + '})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Osa 9A33 ln(1M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Osa 9A33 ln", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1459"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1460"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1461"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1462"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1463"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1464"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(3M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1465"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(6M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 6, ["mobile"] = "false", ["mass"] = "1466"})',
								// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(6M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 6, ["mobile"] = "true", ["mass"] = "1467"})',
							]);
						}

						cmdArray = _.concat(cmdArray, [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "$Resource Points$")',
							'missionCommands.addCommandForGroup("' + unit.groupId + '", "Resource Points Acquired", {"$Resource Points$"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "resourcePoints", ["type"] = "Resource Points", ["unitId"] = ' + unit.unitId + '})'
						]);

						cmdArray = _.concat(cmdArray, [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "$Offensive$")'
						]);

						cmdArray = _.concat(cmdArray, [
							'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "$Defensive$")'
						]);

						if(unit.coalition === 1) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "$Support$")',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AWACS", {"$Support$"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "A-50 AWACS(1000rs)", {"$Support$", "AWACS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnAWACS", ["type"] = "RussianAWACS", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 1000})',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Refueling", {"$Support$"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "IL-78M(HA Drogue)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "RHADTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "KC-135(LA Boom)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "RLABTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "KC-130(LA Drogue)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "RLADTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
							]);
						}
						if(unit.coalition === 2) {
							cmdArray = _.concat(cmdArray, [
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "$Support$")',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AWACS", {"$Support$"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "E-3A AWACS(1000rs)", {"$Support$", "AWACS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnAWACS", ["type"] = "USAAWACS", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 1000})',
								'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Refueling", {"$Support$"})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "KC-135(HA Boom)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "BHABTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "IL-78M(HA Drogue)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "BHADTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "KC-135(LA Boom)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "BLABTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
								'missionCommands.addCommandForGroup("' + unit.groupId + '", "KC-130(LA Drogue)(200rs)", {"$Support$", "Refueling"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnTanker", ["type"] = "BLADTKR", ["unitId"] = ' + unit.unitId + ', ["rsCost"] = 200})',
							]);
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
