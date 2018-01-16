const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const DCSLuaCommands = require('./DCSLuaCommands');

exports.defaultLife = 4;
exports.capLivesEnabled = [
	'F-15C',
	'Su-27',
	'Su-33',
	'MiG-29A',
	'MiG-29S',
	'M-2000C'
];
var oneHour = 60 * 60 * 1000;
//var oneHour = 600 * 1000;

_.set(exports, 'updateServerCapLives', function (serverName, playerArray) {
	var sendClient;
	var actionObj;
	var playerCapTable = [];
	var srvPromises = [];
	//update userNames out of cap lives, locked down specific plane types from those individuals (update lua table with individual names)
	_.forEach(playerArray, function (ePlayer) {
		console.log('eplayer: ', ePlayer);
		srvPromises.push(dbMapServiceController.srvPlayerActions('read', serverName, {_id: ePlayer.ucid})
			.then(function (cPlayer) {
				var lockObj;
				var curPlayer = _.get(cPlayer, [0]);
				if (curPlayer) {
					//add life if its past due
					if (curPlayer.capLifeLastAdded.getTime() + oneHour < new Date().getTime() && curPlayer.curCapLives < 4) {
						exports.autoAddLife(serverName, curPlayer.ucid);
					}
					// console.log('cp: ', curPlayer.curCapLives, curPlayer.capLifeLastAdded.getTime() + oneHour < new Date().getTime() && curPlayer.curCapLives < 4);
					if (curPlayer.curCapLives === 0) {
						lockObj = {
							ucid: curPlayer.ucid,
							val: 1
						};
					} else {
						lockObj = {
							ucid: curPlayer.ucid,
							val: 0
						};
					}
					playerCapTable.push(lockObj);
				}
			})
			.catch(function (err) {
				console.log('line15', err);
			}))
		;
	});
	Promise.all(srvPromises)
		.then(function () {
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
			console.log('line15', err);
		})
	;
});

_.set(exports, 'resetLives', function (serverName, playerUcid, groupId) {
	// reset lives if current session != last session played
	dbMapServiceController.srvPlayerActions('update', serverName, {_id: playerUcid, curCapLives: exports.defaultLife})
		.then(function(capLeft) {
			DCSLuaCommands.sendMesgToGroup(
				groupId,
				serverName,
				"G: You have your modern CAP lives reset, total " + capLeft + " Lives Left!",
				5
			);
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
			console.log(serverName, playerUcid, srvPlayer);
			if (srvPlayer) {
				if (!_.isEmpty(srvPlayer.slot)) {
					dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(srvPlayer.slot)})
						.then(function(cUnit) {
							var curUnit = _.get(cUnit, [0]);
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: You have a modern CAP life added, (" + (srvPlayer.curCapLives+1) + "/4)(1 added every hour)!",
								5
							);
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

_.set(exports, 'removeLife', function (serverName, playerUcid, groupId) {
	console.log('remove: ', serverName, playerUcid, groupId);
	// remove cap life to player or 0 lives
	dbMapServiceController.srvPlayerActions('removeLife', serverName, {_id: playerUcid})
		.then(function(capLeft) {
			console.log('capLeft: ', capLeft);
			DCSLuaCommands.sendMesgToGroup(
				groupId,
				serverName,
				"G: You have a modern CAP life removed, total " + capLeft + " Lives Left!",
				5
			);
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
								timeLeft = ", Gain Next Life in " + _.round((((new Date(curPlayer.capLifeLastAdded).getTime() + oneHour) -  (new Date().getTime()))/1000)/ 60, 1) + " minutes";
							}
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								"G: Your Modern CAP Lives(" + curPlayer.curCapLives + "/" + exports.defaultLife + ")" + timeLeft,
								5
							);
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
