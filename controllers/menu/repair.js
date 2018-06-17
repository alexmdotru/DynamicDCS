const	_ = require('lodash');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'repairBase', function (serverName, base, curUnit, crateOriginLogiName, crate) {
	var curBaseName = base.name;
	// console.log('repairNase: ', base, curUnit, serverName, crateOriginLogiName, curBaseName + ' Logistics', crateOriginLogiName);
	if (curBaseName + ' Logistics' !== crateOriginLogiName) {
		groupController.healBase(serverName, base);
		DCSLuaCommands.sendMesgToCoalition(
			curUnit.coalition,
			serverName,
			"C: " + curBaseName + " Base Has Been Repaired!",
			5
		);
		return true;
	} else {
		DCSLuaCommands.sendMesgToGroup(
			curUnit.groupId,
			serverName,
			"G: Repair Crate Not Close Enough To Base, or Crate has originated from this base!",
			5
		);
	}
	return false;
});
