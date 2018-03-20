const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

exports.capDefaultLife = 2;
exports.casDefaultLife = 4;

exports.capLivesEnabled = [
	'F-15C',
	'Su-27',
	'Su-33',
	'MiG-29A',
	'MiG-29S',
	'M-2000C'
];

exports.casLivesEnabled = [
	'A-10A',
	'A-10C',
	'Su-25T',
	'AV8BNA'
];

exports.underDog = {
	side: 0,
	percent: 1
};

//var oneHour = 600 * 1000;

_.set(exports, 'updateServerLives', function (serverName, playrUnit) {
	var sendClient;
	var actionObj;
	var oneMin = 60 * 1000;
	var playerCapTable = [];
	var serverAlloc = {};
	//update userNames out of cap lives, locked down specific plane types from those individuals (update lua table with individual names)
	dbMapServiceController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: latestSession.name})
					.then(function (playerArray) {
						_.forEach(playerArray, function (ePlayer) {
							if ((new Date(_.get(ePlayer, 'updatedAt', 0)).getTime() + oneMin > new Date().getTime()) && ePlayer.slot) {
								_.set(serverAlloc, [_.get(ePlayer, 'side')], _.get(serverAlloc, [_.get(ePlayer, 'side')], []));
								serverAlloc[_.get(ePlayer, 'side')].push(ePlayer);
							}
						});
						var redAll = _.size(_.get(serverAlloc, 1));
						var blueAll = _.size(_.get(serverAlloc, 2));
						if(redAll < blueAll && redAll !== 0) {
							exports.underDog = {
								side: 1,
								percent: (redAll/blueAll)
							}
						} else if (redAll > blueAll && blueAll !== 0) {
							exports.underDog = {
								side: 2,
								percent: (blueAll/redAll)
							};
						} else {
							exports.underDog = {
								side: 0,
								percent: 1
							}
						}

						console.log('R:' + redAll, ' verse B:', blueAll, exports.underDog);

						_.forEach(playerArray, function (ePlayer) {
							var lockObj;
							if (ePlayer) {
								//cap
								//add life if its past due
								if (new Date(ePlayer.nextCapLife).getTime() < new Date().getTime() && (ePlayer.curCapLives < exports.capDefaultLife)) {
									exports.autoAddLife(serverName, ePlayer.ucid, 'Cap');
								}
								// console.log('cp: ', curPlayer.curCapLives, curPlayer.nextCapLife.getTime() + oneHour < new Date().getTime() && curPlayer.curCapLives < 4);
								if (ePlayer.curCapLives < exports.capDefaultLife) {
									console.log('User: ', ePlayer.name, ePlayer.curCapLives);
								}

								if (ePlayer.curCapLives < 0) {
									lockObj = {
										ucid: ePlayer.ucid + '_CAP',
										val: 1
									};
									exports.autoAddLife(serverName, ePlayer.ucid, 'Cap');
								} else {
									lockObj = {
										ucid: ePlayer.ucid + '_CAP',
										val: 0
									};
								}

								playerCapTable.push(lockObj);

								//cas
								//add life if its past due
								//add life if its past due
								if (new Date(ePlayer.nextCasLife).getTime() < new Date().getTime() && (ePlayer.curCasLives < exports.casDefaultLife)) {
									exports.autoAddLife(serverName, ePlayer.ucid, 'Cas');
								}
								// console.log('cp: ', curPlayer.curCapLives, curPlayer.nextCapLife.getTime() + oneHour < new Date().getTime() && curPlayer.curCapLives < 4);
								if (ePlayer.curCasLives < exports.casDefaultLife) {
									console.log('User: ', ePlayer.name, ePlayer.curCasLives);
								}

								if (ePlayer.curCasLives < 0) {
									lockObj = {
										ucid: ePlayer.ucid + '_CAS',
										val: 1
									};
									exports.autoAddLife(serverName, ePlayer.ucid, 'Cas');
								} else {
									lockObj = {
										ucid: ePlayer.ucid + '_CAS',
										val: 0
									};
								}

								playerCapTable.push(lockObj);
							}
						});
						sendClient = {
							"action" : "SETCAPLIVES",
							"data": playerCapTable
						};
						actionObj = {actionObj: sendClient, queName: 'clientArray'};
						dbMapServiceController.cmdQueActions('save', serverName, actionObj)
							.catch(function (err) {
								console.log('erroring line41: ', err);
							})
						;
					})
					.catch(function (err) {
						console.log('line80', err);
					})
				;
			}
		})
		.catch(function (err) {
			console.log('line86', err);
		})
	;
});

_.set(exports, 'resetLives', function (serverName, playerUcid, unit) {
	// reset lives if current session != last session played
	dbMapServiceController.srvPlayerActions('update', serverName, {_id: playerUcid, curCapLives: exports.defaultLife})
		.then(function(capLeft) {
			DCSLuaCommands.sendMesgToGroup(
				unit.groupId,
				serverName,
				"G: You have your modern CAP lives reset, total " + capLeft + " Lives Left!",
				5
			);
			exports.updateServerCapLives(serverName);
		})
		.catch(function (err) {
			console.log('line15', err);
		})
	;
});

_.set(exports, 'autoAddLife', function (serverName, playerUcid, type) {
	// add cap life to player
	if (type === 'Cap') {
		dbMapServiceController.srvPlayerActions('autoCapAddLife', serverName, {_id: playerUcid})
			.catch(function (err) {
				console.log('line74', err);
			})
		;
	} else if (type === 'Cas') {
		dbMapServiceController.srvPlayerActions('autoCasAddLife', serverName, {_id: playerUcid})
			.catch(function (err) {
				console.log('line74', err);
			})
		;
	}
});

_.set(exports, 'removeLife', function (serverName, playerUcid, curIUnit, type) {
	if (type === 'Cap') {
		dbMapServiceController.srvPlayerActions('removeCapLife', serverName, {_id: playerUcid})
			.then(function(capLeft) {
				DCSLuaCommands.sendMesgToGroup(
					curIUnit.groupId,
					serverName,
					"G: You have a modern CAP life removed, total " + capLeft + " Lives Left!",
					5
				);
				exports.updateServerLives(serverName, curIUnit);
			})
			.catch(function (err) {
				console.log('line92', err);
			})
		;
	} else if (type === 'Cas') {
		dbMapServiceController.srvPlayerActions('removeCasLife', serverName, {_id: playerUcid})
			.then(function(casLeft) {
				DCSLuaCommands.sendMesgToGroup(
					curIUnit.groupId,
					serverName,
					"G: You have a modern CAS life removed, total " + casLeft + " Lives Left!",
					5
				);
				exports.updateServerLives(serverName, curIUnit);
			})
			.catch(function (err) {
				console.log('line92', err);
			})
		;
	}
});

_.set(exports, 'checkCapLives', function (serverName, playerUcid) {
	dbMapServiceController.srvPlayerActions('read', serverName, {_id: playerUcid})
		.then(function(srvPlayer) {
			var curPlayer = _.get(srvPlayer, [0]);
			if (curPlayer) {
				if (!_.isEmpty(curPlayer.slot)) {
					dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(curPlayer.slot)})
						.then(function(cUnit) {
							var curUnit = _.get(cUnit, [0]);
							var timeLeft = '';
							if (curPlayer.curCapLives < exports.capDefaultLife) {
								timeLeft = ", Gain Next Life in " + _.round((((new Date(curPlayer.nextCapLife).getTime()) - (new Date().getTime()))/1000)/ 60, 1) + " minutes";
							}
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: Your Modern CAP Lives(" + curPlayer.curCapLives + "/" + exports.capDefaultLife + ")" + timeLeft,
								5
							);
							exports.updateServerLives(serverName, curUnit);
						})
						.catch(function (err) {
							console.log('line74', err);
						})
					;
				}
			}
		})
		.catch(function (err) {
			console.log('line74', err);
		})
	;
});

_.set(exports, 'checkCasLives', function (serverName, playerUcid) {
	dbMapServiceController.srvPlayerActions('read', serverName, {_id: playerUcid})
		.then(function(srvPlayer) {
			var curPlayer = _.get(srvPlayer, [0]);
			if (curPlayer) {
				if (!_.isEmpty(curPlayer.slot)) {
					dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(curPlayer.slot)})
						.then(function(cUnit) {
							var curUnit = _.get(cUnit, [0]);
							var timeLeft = '';
							if (curPlayer.curCasLives < exports.casDefaultLife) {
								timeLeft = ", Gain Next Life in " + _.round((((new Date(curPlayer.nextCasLife).getTime()) - (new Date().getTime()))/1000)/ 60, 1) + " minutes";
							}
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: Your Modern CAS Lives(" + curPlayer.curCasLives + "/" + exports.casDefaultLife + ")" + timeLeft,
								5
							);
							exports.updateServerLives(serverName, curUnit);
						})
						.catch(function (err) {
							console.log('line74', err);
						})
					;
				}
			}
		})
		.catch(function (err) {
			console.log('line74', err);
		})
	;
});
