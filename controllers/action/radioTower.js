const	_ = require('lodash');
const constants = require('../constants');
const masterDBController = require('../db/masterDB');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const proximityController = require('../proxZone/proximity');

_.assign(exports, {
	baseUnitUnderAttack: function (serverName, unit) {
		// only work on ground units
		// console.log('baseUnderAttack: ', serverName, unit);
		if (_.get(unit, 'category') === 'GROUND') {
			proximityController.getBasesInProximity(serverName, _.get(unit, 'lonLatLoc'), 18, _.get(unit, 'coalition'))
				.then(function (closestBases) {
					if (closestBases) {
						var curDBBase = _.first(closestBases);
						masterDBController.unitActions('read', serverName, {name: _.get(curDBBase, 'name') + ' Communications', dead: false})
							.then(function (aliveComms) {
								if (aliveComms.length > 0) {
									var curBase = _.find(_.get(constants, 'bases'), {_id: _.get(curDBBase, '_id')});
									_.set(curBase, 'underAttack', _.get(curBase, 'underAttack', 0) + 1);
									console.log(_.get(curBase, 'name') + ' is under attack ' + _.get(curBase, 'underAttack') + ' times');
								}
							})
							.catch(function (err) {
								console.log('erroring line189: ', err);
							})
						;
					}
				})
				.catch(function (err) {
					console.log('line 27: ', err);
				})
			;
		}
	},
	checkBaseWarnings: function (serverName) {
		// console.log('checkBaseWarnings');
		_.forEach(_.get(constants, 'bases'), function (base) {
			if(_.get(base, 'underAttack') > 0) {
				DCSLuaCommands.sendMesgToCoalition(
					_.get(base, 'side'),
					serverName,
					_.get(base, 'name') + ' is under attack!',
					20
				);
				_.set(base, 'underAttack', 0);
			}
		})
	}
});
