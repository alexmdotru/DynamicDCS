const	_ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

_.set(exports, 'checkResourcePoints', function (serverName, player) {
	if (player.slot) {
		dbMapServiceController.unitActions('read', serverName, {unitId: _.toNumber(player.slot)})
			.then(function(cUnit) {
				var mesg;
				var curUnit = _.get(cUnit, [0]);

				if (player.side === 1) {
					mesg = 'You have ' + player.redRSPoints + ' Red Resource Points!';
				} else {
					mesg = 'You have ' + player.blueRSPoints + ' Blue Resource Points!';
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
