const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');
var virtualCrates = true;
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

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});

_.set(exports, 'logisticsMenu', function (action, serverName, unit) {
	var cmdArray = [];
	var resetMenu = 'missionCommands.removeItemForGroup("' + unit.groupId + '", "ActionMenu", nil)';
	var actMenu = 'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "ActionMenu")';
	var aTroopMenu = [
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unload / Extract Troops", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit._Id + ', ["side"] = ' + unit.coalition + '})'
	];
	var aUnpackMenu = [
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unpack Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unpackCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
	];
	var vCrateMenu = [
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
	];
	if (action === 'resetMenu') {
		if(_.includes(allowedTypesForTroops, unit.type)) {
			cmdArray = _.concat(cmdArray, aTroopMenu);
			enableAction = true;
		}
		if(_.includes(allowedTypesForCrates, unit.type)) {
			cmdArray = _.concat(cmdArray, aUnpackMenu);
			enableAction = true;
		}
		if(virtualCrates && _.includes(allowedTypesForCrates, unit.type)) {
			cmdArray = _.concat(cmdArray, vCrateMenu);
			enableAction = true;
		}

		if (enableAction) {
			cmdArray.unshift(actMenu);
			enableAction = false;
		}

		cmdArray.unshift(resetMenu);
	}

	if (action === 'addTroopsMenu' && _.includes(allowedTypesForTroops, unit.type)) {
		cmdArray = _.concat(cmdArray, [
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Troops")',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Rifle Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadTroop", ["type"] = "rifleTroop", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load ManPad", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadTroop", ["type"] = "manPad", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load RPG Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadTroop", ["type"] = "rpgTroop", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Mortar Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadTroop", ["type"] = "mortarTroop", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',

		]);
	}
	if (action === 'addLogiCratesMenu' && _.includes(allowedTypesForCrates, unit.type)) {
		cmdArray = _.concat(cmdArray, [
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Acquisitions")',
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateEWR", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateFuelTanker", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateAmmoTruck", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Cars & IFVs", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Armored Car", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateArmoredCar", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "IFV Vehicle", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tank", {"Acquisitions", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateTank", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 4})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Artillary", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateArtillary", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 2})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMLRS", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stationary Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateStationaryGun", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Mobile Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMobileGun", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateInfraredSAM", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Mobile SAM", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMobileSAM", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 3})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MultiPart SAM (Medium Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMRSAM", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 3})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MultiPart SAM (Long Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateLRSAM", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 4})',
		]);
	}

	console.log('cmd: ', cmdArray);
	var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
