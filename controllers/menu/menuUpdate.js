const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const proximityController = require('../proxZone/proximity');
const menuCmdsController = require('../menu/menuCmds'); //menuCmdsController.maxUnitsMoving
const capLivesController = require('../action/capLives');

exports.virtualCrates = false;
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
var allowedTypesForCratesLight = [
	'UH-1H',
	'Ka-50',
	'Mi-8MT'
];

var allowedTypesForCratesHeavy = [
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

						if(_.includes(allowedTypesForTroops, unit.type) && !_.get(unit, 'inAir', true)) {
							cmdArray = _.concat(cmdArray, aTroopMenu);
							enableAction = true;
						}
						if(_.includes(allowedTypesForCratesLight, unit.type) && !_.get(unit, 'inAir', true)) {
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
						if (_.includes(allowedTypesForCratesLight, unit.type) && logiFarpName) {
							if(unit.coalition === 1) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleLite + ')',
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleLite + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "700"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "701"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "702"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC (1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "SKP-11", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "703"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "704"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "705"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "ATZ-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "706"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "Ural-375", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "707"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Cobra(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "Cobra", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "708"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR-80(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR-80", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "711"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "MTLB(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "MTLB", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "713"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BRDM-2(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BRDM-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "715"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BTR_D(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BTR_D", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "717"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Boman(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Boman", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "719"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMD-1(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMD-1", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "721"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-2(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "723"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(2M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "725"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-60(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-60", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "728"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "729"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "730"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(3M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "731"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "733"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "735"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "737"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "739"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "741"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "742"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "743"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "744"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "746"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "747"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleLite + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "748"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "749"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(2M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "750"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(2M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "751"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "753"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-1 9P31(1M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-1 9P31", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "754"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Strela-10M3(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "Strela-10M3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "756"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Osa 9A33 ln(2M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Osa 9A33 ln", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "759"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "760"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "761"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "762"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3M)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "763"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "764"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "765"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(5M)", {"Acquisitions(Stationary)", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "false", ["mass"] = "766"})',
								]);
							}

							if(unit.coalition === 2) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleLite + ')',
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleLite + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Dog Ear radar(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "Dog Ear radar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "700"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Short(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "1L13 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "701"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(2M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "702"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "JTAC(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "JTAC", ["type"] = "Hummer", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "703"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Reload Group(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "reloadGroup", ["type"] = "", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "704"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Repair Base(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "repairBase", ["type"] = "' + logiFarpName + '", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "705"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["type"] = "M978 HEMTT Tanker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "706"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck(1M)", {' + aqMenuTitleLite + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["type"] = "M 818", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "707"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Armored Cars", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee TOW(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1045 HMMWV TOW", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "709"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Humvee MGS(1M)", {' + aqMenuTitleLite + ', "Armored Cars"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["type"] = "M1043 HMMWV Armament", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "710"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Marder(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "Marder", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "712"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "TPZ(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "TPZ", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "714"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "AAV7(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "AAV7", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "716"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-113(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-113", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "718"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "LAV-25(1M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "LAV-25", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "720"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(2M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "722"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(2M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "724"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(2M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "726"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ICV(2M)", {' + aqMenuTitleLite + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1126 Stryker ICV", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "727"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(2M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "732"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "734"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "736"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(4M)", {' + aqMenuTitleLite + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "738"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "740"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "741"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "742"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "743"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "745"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan_BM-27(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "746"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(3M)", {' + aqMenuTitleLite + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "747"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleLite + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement(1M)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "748"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 Emplacement Closed(1M)", {"Acquisitions(Stationary)", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["type"] = "ZU-23 Emplacement Closed", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "749"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(2M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "752"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(3M)", {' + aqMenuTitleLite + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "753"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Avenger(1M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M1097 Avenger", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "755"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Chaparral(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M48 Chaparral", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "757"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Linebacker(2M)", {' + aqMenuTitleLite + ', "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["type"] = "M6 Linebacker", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "758"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleLite + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "760"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "761"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "762"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "763"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(3M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "764"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(4M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4, ["mobile"] = "true", ["mass"] = "765"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(5M)", {' + aqMenuTitleLite + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5, ["mobile"] = "true", ["mass"] = "767"})',
								]);
							}
						}

						if (_.includes(allowedTypesForCratesHeavy, unit.type) && logiFarpName) {
							if (unit.coalition === 1) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleHeavy + ')',
									// 'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleHeavy + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1404"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "BMP-3(1M)", {' + aqMenuTitleHeavy + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "BMP-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1450"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-60(1M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-60", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1456"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-55(1M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-55", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1458"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-72B(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-72B", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1460"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-80UD(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-80UD", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1462"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leclerc(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leclerc", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1466"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Merkava Mk4(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Merkava_Mk4", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1470"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "T-90(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "T-90", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1474"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Msta(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Msta", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1478"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1482"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1484"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1486"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Grad-URAL(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Grad-URAL", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1488"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan BM-27(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1492"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1494"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "ZU-23 on Ural-375(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Ural-375 ZU-23", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1500"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Shilka(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "ZSU-23-4 Shilka", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1502"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(2M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1506"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1520"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1522"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1524"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(3M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1526"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1528"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1530"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-10(5M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "SA-10", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "false", ["mass"] = "1532"})',

								]);
							}

							if (unit.coalition === 2) {
								cmdArray = _.concat(cmdArray, [
									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", ' + aqMenuTitleHeavy + ')',
									// 'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {' + aqMenuTitleHeavy + '})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar Long(1M)", {' + aqMenuTitleHeavy + ',"Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["type"] = "55G6 EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1404"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "IFVs", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-2 Bradley(1M)", {' + aqMenuTitleHeavy + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M-2 Bradley", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1444"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker MGS(1M)", {' + aqMenuTitleHeavy + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1128 Stryker MGS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1448"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stryker ATGM(1M)", {' + aqMenuTitleHeavy + ', "IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["type"] = "M1134 Stryker ATGM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1452"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard1A3(1M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard1A3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1464"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Leopard-2(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Leopard-2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1468"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Challenger2(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "Challenger2", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1472"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-1 Abrams(2M)", {' + aqMenuTitleHeavy + ', "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["type"] = "M-1 Abrams", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1476"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "M-109(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "M-109", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1480"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU 2-C9(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU 2-C9", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1482"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Gvozdika(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Gvozdika", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1484"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "SAU Akatsia(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["type"] = "SAU Akatsia", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1486"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "MLRS", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1490"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Uragan_BM-27(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Uragan_BM-27", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1492"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Smerch(2M)", {' + aqMenuTitleHeavy + ', "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["type"] = "Smerch", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1494"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Vulcan(1M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Vulcan", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1, ["mobile"] = "true", ["mass"] = "1504"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Gepard(2M)", {' + aqMenuTitleHeavy + ', "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["type"] = "Gepard", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1506"})',

									'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {' + aqMenuTitleHeavy + '})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tunguska(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "2S6 Tunguska", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1520"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tor(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["type"] = "Tor 9A331", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1522"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Roland(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Roland", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1524"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "SA-3(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "SA-3", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1526"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Kub(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["type"] = "Kub", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1528"})',
									'missionCommands.addCommandForGroup("' + unit.groupId + '", "Buk(2M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Buk", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2, ["mobile"] = "true", ["mass"] = "1530"})',
									// 'missionCommands.addCommandForGroup("' + unit.groupId + '", "Patriot(3M)", {' + aqMenuTitleHeavy + ', "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["type"] = "Patriot", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3, ["mobile"] = "true", ["mass"] = "1534"})',
								]);
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
