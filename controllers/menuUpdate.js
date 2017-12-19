const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');
var virtualCrates = true;

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});

_.set(exports, 'logisticsMenu', function (action, serverName, unit) {
	var cmdArray;
	var defMenu = [
		'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "ActionMenu")',
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unload / Extract Troops", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit._Id + ', ["side"] = ' + unit.coalition + '})',
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Unpack Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unpackCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
	];
	var vCrateMenu = [
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
		'missionCommands.addCommandForGroup("' + unit.groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + '})',
	];
	if(virtualCrates) {
		defMenu = _.concat(defMenu, vCrateMenu);
	}

	if (action === 'actionMenu') {
		cmdArray = defMenu;
	}
	if (action === 'addLogiTowerMenu') {
		cmdArray = [
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Acquisitions")',
			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Support", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Early Warning Radar", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateEWR", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Fuel Tanker", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateFuelTanker", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Ammo Truck", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateAmmoTruck", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',

			'missionCommands.addSubMenuForGroup("' + unit.groupId + '", "Troops", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Infantry", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnInfantry", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load RPG Team", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnRPG", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + unit.groupId + '", "Load Mortar Team", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnMortar", ["groupId"] = ' + unit.groupId + ', ["unitId"] = ' + unit.unitId + ', ["side"] = ' + unit.coalition + ', ["crates"] = 1})',

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
		];
	}
	if (action === 'removeLogiTowerMenu') {
		cmdArray = defMenu;
		cmdArray.unshift('missionCommands.removeItemForGroup("' + unit.groupId + '", nil)');
	}
	var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
