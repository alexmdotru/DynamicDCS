const	_ = require('lodash');
const masterDBController = require('../db/masterDB');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');

_.set(exports, 'repairBase', function (serverName, base, curUnit) {
	var curBaseName = _.first(_.split(_.get(base, 'name'), ' #'));
	// console.log('repairNase: ', base, curUnit, serverName, crateOriginLogiName, curBaseName + ' Logistics', crateOriginLogiName);
	groupController.healBase(serverName, curBaseName, curUnit);
	masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
		.catch(function (err) {
			console.log('erroring line209: ', err);
		})
	;
	DCSLuaCommands.sendMesgToCoalition(
		curUnit.coalition,
		serverName,
		"C: " + curBaseName + " Base Has Been Repaired!",
		5
	);
	return true;
});
