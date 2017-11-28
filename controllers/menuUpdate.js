const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});

_.set(exports, 'logisticsMenu', function (action, groupId, unitId, side) {
	if (action === 'addTroopMenu') {
		var addTroopCmdArray = [
			'missionCommands.addSubMenuForGroup("' + groupId + '", "Troop Logistics")',
			'missionCommands.addCommandForGroup("' + groupId + '", "Unload / Extract Troops", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["groupId"] = ' + _groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Infantry", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadInfantry", ["groupId"] = ' + _groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load RPG Team", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadRPG", ["groupId"] = ' + _groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Mortar Team", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadMortarTeam", ["groupId"] = ' + _groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
		];
	}
	if (action === 'removeTroopMenu') {
		var removeTroopCmdArray = [
			'missionCommands.removeItemForGroup("' + groupId + '", "Troop Logistics")'
		];
	}
	if (action === 'addCrateMenu') {

	}
	if (action === 'removeCrateMenu') {

	}
});
