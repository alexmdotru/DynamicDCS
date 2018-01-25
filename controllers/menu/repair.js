const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const groupController = require('./group');
const proximityController = require('./proximity');

_.set(exports, 'repairBase', function (serverName, curUnit, crateOriginLogiName, crate) {
	var baseClose = proximityController.extractUnitsBackToBase(curUnit, serverName);
	if (baseClose + ' Logistics' !== crateOriginLogiName) {
		groupController.healBase(serverName, baseClose);
		// baracks
		// base respawn building
		groupController.destroyUnit(serverName, crate.name);
		DCSLuaCommands.sendMesgToGroup(
			curUnit.groupId,
			serverName,
			"G: " + baseClose + " Base Has Been Repaired!",
			5
		);
	} else {
		DCSLuaCommands.sendMesgToGroup(
			curUnit.groupId,
			serverName,
			"G: Repair Crate Not Close Enough To Base, or Crate has originated from this base!",
			5
		);
	}
});
