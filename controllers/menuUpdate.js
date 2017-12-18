const	_ = require('lodash');

const dbMapServiceController = require('./dbMapService');
const groupController = require('./group');

_.set(exports, 'menuCmdProcess', function (processObj) {
	console.log('process menu cmd: ', processObj);
});

_.set(exports, 'logisticsMenu', function (action, serverName, groupId, unitId, side) {
	var cmdArray;
	if (action === 'addTroopMenu') {
		cmdArray = [
			'missionCommands.addSubMenuForGroup("' + groupId + '", "Troop Logistics")',
			'missionCommands.addCommandForGroup("' + groupId + '", "Unload / Extract Troops", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "unloadExtractTroops", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Infantry", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadInfantry", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load RPG Team", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadRPG", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
			'missionCommands.addCommandForGroup("' + groupId + '", "Load Mortar Team", {"Troop Logistics"}, sendCmd, {["action"] = "f10Menu", ["cmd"] = "loadMortarTeam", ["groupId"] = ' + groupId + ', ["unitId"] = ' + unitId + ', ["side"] = ' + side + '})',
		];
	}
	if (action === 'removeTroopMenu') {
		cmdArray = [
			'missionCommands.removeItemForGroup("' + groupId + '", "Troop Logistics")'
		];
	}
	if (action === 'addCrateMenu') {

	}
	if (action === 'removeCrateMenu') {

	}
	var sendClient = {action: "CMD", cmd: cmdArray, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj);
});
