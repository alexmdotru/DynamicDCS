const	_ = require('lodash');
const dbMapServiceController = require('./dbMapService');
const DCSLuaCommands = require('./DCSLuaCommands');
const groupController = require('./group');
const proximityController = require('./proximity');

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

_.set(exports, 'resetLives', function () {
	// reset lives if current session != last session played
});

_.set(exports, 'addLife', function () {
	// add cap life to player
});

_.set(exports, 'removeLife', function () {
	// remove cap life to player or 0 lives
});
