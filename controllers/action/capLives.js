const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

exports.defaultLife = 2;
exports.capLivesEnabled = [
	'F-15C',
	'Su-27',
	'Su-33',
	'MiG-29A',
	'MiG-29S',
	'M-2000C'
];
exports.underDog = {
	side: 0,
	percent: 1
};

//var oneHour = 600 * 1000;

_.set(exports, 'updateServerCapLives', function (serverName, playrUnit) {
	var sendClient;
	var actionObj;
	var fiveMins = 5 * 60 * 1000;
	var playerCapTable = [];
	var serverAlloc = {};
	//update userNames out of cap lives, locked down specific plane types from those individuals (update lua table with individual names)
	dbMapServiceController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: latestSession.name})
					.then(function (playerArray) {
						_.forEach(playerArray, function (ePlayer) {
							if (new Date(_.get(ePlayer, 'updatedAt', 0)).getTime() + fiveMins > new Date().getTime()) {
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
								//add life if its past due
								if (new Date(ePlayer.nextCapLife).getTime() < new Date().getTime() && (ePlayer.curCapLives < exports.defaultLife)) {
									exports.autoAddLife(serverName, ePlayer.ucid);
								}
								// console.log('cp: ', curPlayer.curCapLives, curPlayer.nextCapLife.getTime() + oneHour < new Date().getTime() && curPlayer.curCapLives < 4);
								if (ePlayer.curCapLives < exports.defaultLife) {
									console.log('User: ', ePlayer.name, ePlayer.curCapLives);
								}

								if (ePlayer.curCapLives < 0) {
									lockObj = {
										ucid: ePlayer.ucid,
										val: 1
									};
									exports.autoAddLife(serverName, ePlayer.ucid);
								} else {
									lockObj = {
										ucid: ePlayer.ucid,
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

_.set(exports, 'autoAddLife', function (serverName, playerUcid) {
	// add cap life to player
	dbMapServiceController.srvPlayerActions('autoAddLife', serverName, {_id: playerUcid})
		.then(function(srvPlayer) {
			//console.log(serverName, playerUcid, srvPlayer);
			/* wasnt working
			if (srvPlayer) {
				if (!_.isEmpty(srvPlayer.slot)) {
					dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(srvPlayer.slot)})
						.then(function(cUnit) {
							var curUnit = _.get(cUnit, [0]);
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: You have a modern CAP life added, (" + (srvPlayer.curCapLives+1) + "/" + exports.defaultLife + ")(1 added every hour)!",
								5
							);
							exports.updateServerCapLives(serverName);
						})
						.catch(function (err) {
							console.log('line74', err);
						})
					;
				}
			}
			*/
		})
		.catch(function (err) {
			console.log('line74', err);
		})
	;
});

_.set(exports, 'removeLife', function (serverName, playerUcid, curIUnit) {
	//console.log('remove: ', serverName, playerUcid, groupId);
	// remove cap life to player or 0 lives
	dbMapServiceController.srvPlayerActions('removeLife', serverName, {_id: playerUcid})
		.then(function(capLeft) {
			DCSLuaCommands.sendMesgToGroup(
				curIUnit.groupId,
				serverName,
				"G: You have a modern CAP life removed, total " + capLeft + " Lives Left!",
				5
			);
			exports.updateServerCapLives(serverName, curIUnit);
		})
		.catch(function (err) {
			console.log('line92', err);
		})
	;
});

_.set(exports, 'checkLives', function (serverName, playerUcid) {
	dbMapServiceController.srvPlayerActions('read', serverName, {_id: playerUcid})
		.then(function(srvPlayer) {
			var curPlayer = _.get(srvPlayer, [0]);
			if (curPlayer) {
				if (!_.isEmpty(curPlayer.slot)) {
					dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(curPlayer.slot)})
						.then(function(cUnit) {
							var curUnit = _.get(cUnit, [0]);
							var timeLeft = '';
							if (curPlayer.curCapLives < exports.defaultLife) {
								timeLeft = ", Gain Next Life in " + _.round((((new Date(curPlayer.nextCapLife).getTime()) - (new Date().getTime()))/1000)/ 60, 1) + " minutes";
							}
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: Your Modern CAP Lives(" + curPlayer.curCapLives + "/" + exports.defaultLife + ")" + timeLeft,
								5
							);
							exports.updateServerCapLives(serverName, curUnit);
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
