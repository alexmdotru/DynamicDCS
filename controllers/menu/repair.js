const	_ = require('lodash');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');
const proximityController = require('../proxZone/proximity');

_.set(exports, 'repairBase', function (serverName, curUnit, crateOriginLogiName, crate) {
	//var baseClose = proximityController.extractUnitsBackToBase(curUnit, serverName);
	proximityController.getLogiTowersProximity(serverName, curUnit.lonLatLoc, 3)
		.then(function (closeBase) {
			console.log('repairNase: ', closeBase, curUnit, serverName, crateOriginLogiName);
			if (closeBase + ' Logistics' !== crateOriginLogiName) {
				groupController.healBase(serverName, closeBase);
				// baracks
				// base respawn building
				if (crate) {
					groupController.destroyUnit(serverName, crate.name);
				}
				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					"G: " + closeBase + " Base Has Been Repaired!",
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
		})
		.catch(function(err) {
			console.log('err line1072: ', err);
		})
	;
});
