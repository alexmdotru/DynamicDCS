const	_ = require('lodash');
const constants = require('../constants');
const masterDBController = require('../db/masterDB');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const groupController = require('../spawn/group');

_.assign(exports, {
	repairBase: function (serverName, base, curUnit) {
		var curBaseName = _.first(_.split(_.get(base, 'name'), ' #'));
		// console.log('repairNase: ', base, curUnit, serverName, crateOriginLogiName, curBaseName + ' Logistics', crateOriginLogiName);
		groupController.healBase(serverName, curBaseName, curUnit)
			.then(function (resp) {
				if (resp) {
					masterDBController.unitActions('updateByUnitId', serverName, {unitId: curUnit.unitId, intCargoType: ''})
						.catch(function (err) {
							console.log('erroring line209: ', err);
						})
					;
					DCSLuaCommands.sendMesgToCoalition(
						curUnit.coalition,
						serverName,
						"C: " + curBaseName + " Base Has Been Repaired/Built!",
						5
					);
				}
			})
			.catch(function (err) {
				console.log('erroring line26: ', err);
			})
		;
		return true;
	},
	repairBaseSAMRadars: function (serverName) {
		var groups;
		var launcher;
		// console.log('RS: ', serverName, unitCalling);
		return new Promise(function(resolve, reject) {
			//grab all SAM's
			//group by SAM group
			var samTypeArray = _.map(_.filter( _.get(constants, 'unitDictionary'), function (filtObj) {
				return _.get(filtObj, 'spawnCat') === 'samRadar' || _.get(filtObj, 'spawnCat') === 'unarmedAmmo';
			}) , 'type');
			// console.log('sa: ', samTypeArray);
			masterDBController.unitActions('read', serverName, {type: {$in:samTypeArray }, dead: false})
				.then(function(units){
					groups = _.groupBy(units, 'groupName');
					_.forEach(groups, function (group) {
						launcher = 0;
						_.forEach(group, function (element) {
							_.set(element, 'unitDict', _.find(
								_.cloneDeep( _.get(constants, 'unitDictionary')),
								{_id: _.get(element, 'type')}
							));
							if(_.get(element, 'unitDict.launcher')) {
								launcher += 1;
							}
						});
						var curReqArray = _.get(
							_.find(group, function (curGroup) {
								return _.get(curGroup, 'unitDict.launcher');
							}),
							'unitDict.reloadReqArray'
						);

						var unitsMissing = _.difference(curReqArray, _.uniq(_.map(group, 'type')));

						// if there are units missing and the launcher exists, fix the group
						if(unitsMissing.length && launcher) {
							var curSAMTemplate = _.first(group);
							var tNameArry = _.split(curSAMTemplate, '|');
							//add missing units to existing array
							groupController.spawnStarSam(
								serverName,
								_.get(curSAMTemplate, 'coalition'),
								_.get(tNameArry, [1]),
								_.get(tNameArry, [2]).charAt(0),
								launcher
							);
							console.log('TRUCKHERE? ', unitsMissing);
							_.forEach(group, function (removeElement) {
								groupController.destroyUnit(serverName, _.get(removeElement, 'name'));
							});
							resolve(true);
						}
					});
				})
				.catch(function (err) {
					reject(err);
					console.log('line 125: ', err);
				})
			;
		});
	}
});
