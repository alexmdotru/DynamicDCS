const	_ = require('lodash');
const masterDBController = require('../db/masterDB');
const proximityController = require('../proxZone/proximity');
const groupController = require('../spawn/group');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.set(exports, 'spawnCCAtNeutralBase', function (serverName, curPlayerUnit) {
	masterDBController.baseActions('read', serverName, {mainBase: false, expansion: false, farp: false})
		.then(function (bases) {
			_.forEach(bases, function (base) {
				proximityController.getPlayersInProximity(serverName, _.get(base, 'centerLoc'), 3.4, false, curPlayerUnit.coalition)
					.then(function (unitsInProx) {
						if(_.find(unitsInProx, {playername: curPlayerUnit.playername})) {
							masterDBController.unitActions('read', serverName, {_id: base.name + ' Logistics', dead: false})
								.then(function (isCCExist) {
									if (isCCExist > 0) {
										DCSLuaCommands.sendMesgToGroup(
											curPlayerUnit.groupId,
											serverName,
											'G: ' + base.name + ' Command Center Already Exists.',
											5
										);
									} else {
										// console.log('player: ', curPlayerUnit);
										groupController.spawnLogisticCmdCenter(serverName, {}, false, base, curPlayerUnit.coalition);
										var mesg = 'C: ' + base.name + ' Command Center Is Now Built!';
										DCSLuaCommands.sendMesgToCoalition(
											curPlayerUnit.coalition,
											serverName,
											mesg,
											20
										);
									}
								})
								.catch(function (err) {
									console.log('erroring line162: ', err);
								})
							;
						}
					})
					.catch(function (err) {
						console.log('line 1297: ', err);
					})
				;
			});
		})
		.catch(function (err) {
			console.log('line 1303: ', err);
		})
	;
});
