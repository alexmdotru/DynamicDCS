const	_ = require('lodash');
const masterDBController = require('../db/masterDB');

_.set(exports, 'setSideLockFlags', function (serverName) {
	// console.log('SETSIDELOCKGFLAGS ');
	var playerSideLockTable = [];
	masterDBController.statSessionActions('readLatest', serverName, {})
		.then(function (latestSession) {
			if (latestSession.name) {
				masterDBController.srvPlayerActions('read', serverName, {sessionName: latestSession.name})
					.then(function (playerArray) {
						_.forEach(playerArray, function (player) {
							var lockObj;
							var lockedSide =  player.sideLock;
							if(player.isGameMaster) {
								lockObj = {
									ucid: player._id + '_GM',
									val: 1
								};
							} else {
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
							}
							playerSideLockTable.push(lockObj);
						});
						sendClient = {
							"action" : "SETSIDELOCK",
							"data": playerSideLockTable
						};
						actionObj = {actionObj: sendClient, queName: 'clientArray'};
						console.log('setSideLock: ', sendClient);
						masterDBController.cmdQueActions('save', serverName, actionObj)
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
