const	_ = require('lodash');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'repairBase', function (serverName, curUnit, crateOriginLogiName, crate) {
	//var baseClose = proximityController.extractUnitsBackToBase(curUnit, serverName);
	var baseClose = proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 3);
	console.log('repairNase: ', baseClose, curUnit, serverName, crateOriginLogiName);
	if (baseClose + ' Logistics' !== crateOriginLogiName) {
		groupController.healBase(serverName, baseClose);
		// baracks
		// base respawn building
		if (crate) {
			groupController.destroyUnit(serverName, crate.name);
		}
		DCSLuaCommands.sendMesgToGroup(
			curUnit.groupId,
			serverName,
			"G: " + baseClose + " Base Has Been Repaired!",
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
