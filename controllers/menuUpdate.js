const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');

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

_.set(exports, 'logisticsMenu', function (action, serverName, unit) {
	var cmdArray = [];
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
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["unitId"] = ' + unit.unitId + '})',
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["unitId"] = ' + unit.unitId + '})',
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
			cmdArray = _.concat(actMenu, cmdArray);
			enableAction = false;
		}

		cmdArray.unshift(resetMenu);
	}

	if (action === 'addTroopsMenu' && _.includes(allowedTypesForTroops, unit.type)) {
		cmdArray = _.concat(cmdArray, [
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Troops")',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Rifle Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "soldier", ["unitId"] = ' + unit.unitId + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load MG Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MGSoldier", ["unitId"] = ' + unit.unitId + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load ManPad", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "manpad", ["unitId"] = ' + unit.unitId + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load RPG Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "RPG", ["unitId"] = ' + unit.unitId + '})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Mortar Troop", {"Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mortar", ["unitId"] = ' + unit.unitId + '})',

		]);
	}
	if (action === 'addLogiCratesMenu' && _.includes(allowedTypesForCrates, unit.type)) {
		cmdArray = _.concat(cmdArray, [
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Acquisitions")',
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "EWR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedFuel", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unarmedAmmo", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Cars & IFVs", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Armored Car", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "armoredCar", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "APC Vehicle", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "APC", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Tanks", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Tank", {"Acquisitions", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "tank", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Artillary & MLRS", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Artillary", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "artillary", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MLRS", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mlrs", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "AntiAir", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Stationary Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "stationaryAntiAir", ["unitId"] = ' + unit.unitId + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Mobile Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileAntiAir", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Infrared SAM", {"Acquisitions", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "samIR", ["unitId"] = ' + unit.unitId + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Radar SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Mobile SAM", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "mobileSAM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 3})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MultiPart SAM (Medium Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "MRSAM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 4})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "MultiPart SAM (Long Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "LRSAM", ["unitId"] = ' + unit.unitId + ', ["crates"] = 5})',
		]);
	}

	console.log('cmd: ', cmdArray);
	var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
