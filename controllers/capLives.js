const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const DCSLuaCommands = require('./DCSLuaCommands');

var defaultLife = 4;
//var oneHour = 60 * 60 * 1000;
var oneHour = 60 * 1000;

_.set(exports, 'updateServerCapLives', function (serverName, playerArray) {
	var sendClient;
	var actionObj;
	var playerCapTable = [];
	var srvPromises = [];
	//update userNames out of cap lives, locked down specific plane types from those individuals (update lua table with individual names)
	_.forEach(playerArray, function (eplayer) {
		srvPromises.push(dbMapServiceController.srvPlayerActions('read', serverName, {_id: eplayer.ucid})
			.then(function (eplayer) {
				var lockObj;
				var curPlayer = _.get(eplayer, [0]);
				if (curPlayer) {
					//add life if its past due
					if (curPlayer.capLifeLastAdded + oneHour < new Date().getTime()) {
						exports.autoAddLife(serverName, eplayer.ucid);
					}

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
	dbMapServiceController.srvPlayerActions('update', serverName, {_id: playerUcid, curCapLives: defaultLife})
		.then(function(capLeft) {
			DCSLuaCommands.sendMesgToGroup(
				groupId,
				serverName,
				"G: You have a CAP lives reset, total " + capLeft + " Lives Left!",
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
			console.log('srvplayer: ', srvPlayer);
			var curPlayer = _.get(srvPlayer, [0]);
			if (curPlayer) {
				dbMapServiceController.unitActions('read', serverName, {unitId: curPlayer.unitId})
					.then(function(curUnit) {
						var curUnit = _.get(curUnit, [0]);
						DCSLuaCommands.sendMesgToGroup(
							curUnit.groupId,
							serverName,
							"G: You have a CAP life added, total " + curPlayer.curCapLives + " Lives Left(1 added every hour)!",
							5
						);
					})
					.catch(function (err) {
						console.log('line74', err);
					})
				;
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
				"G: You have a CAP life removed, total " + capLeft + " Lives Left!",
				5
			);
		})
		.catch(function (err) {
			console.log('line92', err);
		})
	;
});
