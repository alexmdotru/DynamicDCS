const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.set(exports, 'spendResourcePoints', function (serverName, player, rsCost, rsItem, itemObj) {
	return dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(player.slot)})
		.then(function(cUnit) {
			var mesg;
			var currentObjUpdate;
			var curUnit = _.get(cUnit, [0]);
			var curName = 'AI|' + _.get(itemObj, 'name', '') + '|';
			//if (curUnit.inAir) {
			if (true) {
				return dbMapServiceController.unitActions('read', serverName, {_id: curName})
					.then(function(unitExist) {
						if(unitExist.length > 0 && rsItem === 'Tanker') {
							mesg = 'G: Tanker your trying to spawn already exists';
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								mesg,
								5
							);
							return false;
						} else if(unitExist.length > 0 && rsItem === 'AWACS') {
							mesg = 'G: AWACS your trying to spawn already exists';
							DCSLuaCommands.sendMesgToGroup(
								curUnit.groupId,
								serverName,
								mesg,
								5
							);
							return false;
						} else {
							if (player.side === 1) {
								if(player.redRSPoints >= rsCost){
									currentObjUpdate = {
										_id: player._id,
										redRSPoints: player.redRSPoints - rsCost
									};
									return dbMapServiceController.srvPlayerActions('update', serverName, currentObjUpdate)
										.then(function () {
											mesg = 'G: You have spent red ' + rsCost + ' points on a ' + rsItem + '(' + currentObjUpdate.redRSPoints + 'pts left)';
											DCSLuaCommands.sendMesgToGroup(
												curUnit.groupId,
												serverName,
												mesg,
												5
											);
											return true;
										})
										.catch(function (err) {
											console.log('line114', err);
										})
										;
								} else {
									mesg = 'G: You do not have red ' + rsCost + ' points to buy a ' + rsItem + ' (' + player.redRSPoints + 'pts)';
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										mesg,
										5
									);
									return false;
								}
							} else {
								if(player.blueRSPoints >= rsCost){
									currentObjUpdate = {
										_id: player._id,
										blueRSPoints: player.blueRSPoints - rsCost
									};
									return dbMapServiceController.srvPlayerActions('update', serverName, currentObjUpdate)
										.then(function () {
											mesg = 'G: You have spent ' + rsCost + ' blue points on a ' + rsItem + '(' + currentObjUpdate.blueRSPoints + 'pts left)';
											DCSLuaCommands.sendMesgToGroup(
												curUnit.groupId,
												serverName,
												mesg,
												5
											);
											return true;
										})
										.catch(function (err) {
											console.log('line114', err);
										})
										;
								} else {
									mesg = 'G: You do not have ' + rsCost + ' blue points to buy a ' + rsItem + ' (' + player.blueRSPoints + 'pts)';
									DCSLuaCommands.sendMesgToGroup(
										curUnit.groupId,
										serverName,
										mesg,
										5
									);
									return false;
								}
							}
						}
					})
					.catch(function (err) {
						console.log('line114', err);
					})
					;
			} else {
				mesg = 'G: You cannot spend RS points on the ground, Please TakeOff First, Then Call RS Point Option!';
				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					mesg,
					5
				);
				return false;
			}
		})
		.catch(function (err) {
			console.log('line26', err);
		})
	;
});

_.set(exports, 'checkResourcePoints', function (serverName, player) {
	if (player.slot) {
		dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(player.slot)})
			.then(function(cUnit) {
				var mesg;
				var curUnit = _.get(cUnit, [0]);

				if (player.side === 1) {
					mesg = 'G: You have ' + player.redRSPoints + ' Red Resource Points!';
				} else {
					mesg = 'G: You have ' + player.blueRSPoints + ' Blue Resource Points!';
				}

				DCSLuaCommands.sendMesgToGroup(
					curUnit.groupId,
					serverName,
					mesg,
					5
				);
			})
			.catch(function (err) {
				console.log('line26', err);
			})
		;
	}
});
