const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');

_.set(exports, 'setSideLockFlags', function (serverName) {
	// console.log('SETSIDELOCKGFLAGS ');
	var playerSideLockTable = [];
	dbMapServiceController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				dbMapServiceController.srvPlayerActions('read', serverName, {sessionName: latestSession.name})
					.then(function (playerArray) {
						_.forEach(playerArray, function (player) {
							var lockObj;
							var lockedSide =  player.sideLock;
							if(lockedSide > 0) {
								lockObj = {
									ucid: player._id + '_' + lockedSide,
									val: 1
								};
							} else {
								lockObj = {
									ucid: player._id + '_' + lockedSide,
									val: 0
								};
							}
							playerSideLockTable.push(lockObj);
						});
						sendClient = {
							"action" : "SETSIDELOCK",
							"data": playerSideLockTable
						};
						actionObj = {actionObj: sendClient, queName: 'clientArray'};
						// console.log('AOBJ: ', playerSideLockTable);
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
