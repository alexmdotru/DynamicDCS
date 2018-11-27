const	_ = require('lodash');
const masterDBController = require('../db/masterDB');
const proximityController = require('../proxZone/proximity');
const groupController = require('../spawn/group');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const baseSpawnFlagsController = require('../action/baseSpawnFlags');

_.assign(exports, {
	checkCmdCenters: function (serverName) {
		masterDBController.baseActions('read', serverName, {mainBase: false, expansion: false, farp: false})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					masterDBController.unitActions('read', serverName, {_id: base.name + ' Logistics', dead: false})
						.then(function (isCCExist) {
							if (isCCExist > 0) {
								masterDBController.baseActions('updateSide', serverName, {name: base.name, side: _.get(_.first(isCCExist), 'coalition')})
									.catch(function (err) {
										console.log('erroring line162: ', err);
									})
								;
							} else {
								masterDBController.baseActions('updateSide', serverName, {name: base.name, side: 0})
									.catch(function (err) {
										console.log('erroring line162: ', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('erroring line162: ', err);
						})
					;
				});
				baseSpawnFlagsController.setbaseSides(serverName);
			})
			.catch(function (err) {
				console.log('line 1303: ', err);
			})
		;
	},
	spawnCCAtNeutralBase: function (serverName, curPlayerUnit) {
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
											masterDBController.baseActions('updateSide', serverName, {name: base.name, side: curPlayerUnit.coalition})
												.then(function () {
													baseSpawnFlagsController.setbaseSides(serverName);
												})
												.catch(function (err) {
													console.log('erroring line162: ', err);
												})
											;
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
	}
});
_.set(exports, 'spawnCCAtNeutralBase', );
