const _ = require('lodash');
const constants = require('../constants');
const masterDBController = require('../db/masterDB');
const groupController = require('../spawn/group');

_.set(exports, 'processFiveSecActions', function (serverName, fullySynced) {
	var replenThreshold = 1; // percentage under max
	var replenBase = _.get(constants, ['config', 'replenThresholdBase']) * replenThreshold;
	var replenFarp = _.get(constants, ['config', 'replenThresholdFARP']) * replenThreshold;
	var replenTimer = _.random(_.get(constants, 'config.replenTimer')/2, _.get(constants, 'config.replenTimer'));

	if (fullySynced) {
		//set base flags
		masterDBController.baseActions('read', serverName, {mainBase: true})
			.then(function (bases) {
				_.forEach(bases, function (base) {
					var curRegEx = '^' + _.get(base, '_id') + ' #';
					var unitCnt = (_.get(base, 'farp')) ?  replenFarp : replenBase;
					masterDBController.unitActions('read', serverName, {name: new RegExp(curRegEx), dead: false})
						.then(function (units) {
							var replenEpoc = new Date(_.get(base, 'replenTime', 0)).getTime();
							masterDBController.unitActions('read', serverName, {name: _.get(base, 'name') + ' Communications', dead: false})
								.then(function (aliveComms) {
									if (aliveComms.length > 0) {
										// console.log('BASE units, replen: ', base.name, units.length, unitCnt, replenBase, replenFarp, _.get(constants, ['config', 'replenThresholdBase']));
										if ((units.length < unitCnt) && replenEpoc < new Date().getTime()) { //UNCOMMENT OUT FALSE
											masterDBController.baseActions('updateReplenTimer', serverName, {name: _.get(base, '_id'),  replenTime: new Date().getTime() + (replenTimer * 1000)})
												.then(function () {
													// console.log(serverName, base, base.side);
													groupController.spawnSupportPlane(serverName, base, base.side);
												})
												.catch(function (err) {
													console.log('line 62: ', err);
												})
											;
										}
									}
								})
								.catch(function (err) {
									console.log('erroring line189: ', err);
								})
							;
						})
						.catch(function (err) {
							console.log('line 68: ', err);
						})
					;
				});
			})
			.catch(function (err) {
				console.log('line51', err);
			})
		;
	}
});
