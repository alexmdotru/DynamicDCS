const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});

_.set(exports, 'logisticsMenu', function (action, serverName, groupId, unitId, side) {
	var cmdArray;
	var defMenu = [
		'missionCommands.addSubMenuForGroup("' + groupId + '", "ActionMenu")',
		'missionCommands.addCommandForGroup("' + groupId + '", "Unload / Extract Troops", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
		'missionCommands.addCommandForGroup("' + groupId + '", "Unpack Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unpackCrate", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
		'missionCommands.addCommandForGroup("' + groupId + '", "Load Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadCrate", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
		'missionCommands.addCommandForGroup("' + groupId + '", "Drop Crate", {"ActionMenu"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "dropCrate", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
	];
	if (action === 'actionMenu') {
		cmdArray = defMenu;
	}
	if (action === 'addLogiTowerMenu') {
		cmdArray = [
			'missionCommands.addSubMenuForGroup("' + groupId + '", "Acquisitions")',
			'missionCommands.addSubMenuForGroup("' + groupId + '", "Support", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Early Warning Radar", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateEWR", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Fuel Tanker", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateFuelTanker", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Ammo Truck", {"Acquisitions","Support"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateAmmoTruck", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Troops", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Infantry", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnInfantry", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load RPG Team", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnRPG", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Mortar Team", {"Acquisitions", "Troops"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnMortar", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Cars & IFVs", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Armored Car", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateArmoredCar", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "IFV Vehicle", {"Acquisitions", "Cars & IFVs"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrate", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Tanks", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Tank", {"Acquisitions", "Tanks"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateTank", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 4})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Artillary & MLRS", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Artillary", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateArtillary", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 2})',
			'missionCommands.addCommandForGroup("' + groupId + '", "MLRS", {"Acquisitions", "Artillary & MLRS"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMLRS", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "AntiAir", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Stationary Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateStationaryGun", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 1})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Mobile Gun", {"Acquisitions", "AntiAir"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMobileGun", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Infrared SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Infrared SAM", {"Acquisitions", "Infrared SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateInfraredSAM", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 2})',

			'missionCommands.addSubMenuForGroup("' + groupId + '", "Radar SAM", {"Acquisitions"})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Mobile SAM", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMobileSAM", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 3})',
			'missionCommands.addCommandForGroup("' + groupId + '", "MultiPart SAM (Medium Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateMRSAM", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 3})',
			'missionCommands.addCommandForGroup("' + groupId + '", "MultiPart SAM (Long Range)", {"Acquisitions", "Radar SAM"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "spawnCrateLRSAM", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + ', ["crates"] = 4})',
		];
	}
	if (action === 'removeLogiTowerMenu') {
		cmdArray = defMenu;
		cmdArray.unshift('missionCommands.removeItemForGroup("' + groupId + '", "Acquisitions")');
	}

	if (action === 'addCrateMenu') {

	}
	if (action === 'removeCrateMenu') {

	}
	var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
