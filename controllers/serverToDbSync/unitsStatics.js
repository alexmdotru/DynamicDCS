const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const taskController = require('../action/task');
const webPushCommands = require('../socketIO/webPush');

_.set(exports, 'processUnitUpdates', function (serverName, sessionName, unitObj) {
	dbMapServiceController.unitActions('read', serverName, {_id: _.get(unitObj, 'data.name')})
		.then(function (unit) {
			var stParse;
			var iCurObj;
			var curUnit = _.get(unit, 0, {});
			var curUnitName = _.get(curUnit, 'name');
			var curData = _.get(unitObj, 'data');
			if (!_.includes(curData.name, 'New Static Object')) {
				// build out extra info on spawned items isAI
				if (_.includes(curData.name, 'AI|')) {
					stParse = _.split(curData.name, '|');
					_.set(curData, 'playerOwnerId', stParse[1]);
					_.set(curData, 'isAI', true);
				}
				if (_.includes(curData.name, 'TU|')) {
					stParse = _.split(curData.name, '|');
					_.set(curData, 'playerOwnerId', stParse[1]);
					_.set(curData, 'playerCanDrive', false);
					_.set(curData, 'isTroop', true);
					_.set(curData, 'spawnCat', stParse[2]);
				}
				if (_.includes(curData.name, 'CU|')) {
					stParse = _.split(curData.name, '|');
					_.set(curData, 'playerOwnerId', stParse[1]);
					_.set(curData, 'isCombo', _.isBoolean(stParse[5]));
					_.set(curData, 'playerCanDrive', false);
					_.set(curData, 'isCrate', true);
				}
				if (_.includes(curData.name, 'DU|')) {
					stParse = _.split(curData.name, '|');
					_.set(curData, 'playerOwnerId', stParse[1]);
					_.set(curData, 'proxChkGrp', stParse[3]);
					_.set(curData, 'playerCanDrive', stParse[5]);
				}
				//set ewr task to ewr if new
				/*
                if (curUnit.type === '1L13 EWR' || curUnit.type === '55G6 EWR') {
                    if (!_.get(taskController, ['ewrUnitsActivated', curUnitName], false)) {
                        console.log('Set ewr for: ', curUnitName );
                        taskController.setEWRTask(serverName, curUnitName);
                        _.set(taskController, ['ewrUnitsActivated', curUnitName], true);
                    }
                }
                */

				if ((!_.isEmpty(curUnit) && _.get(unitObj, 'action') !== 'D')) {
					iCurObj = {
						action: 'U',
						sessionName: sessionName,
						data: {
							_id: _.get(curData, 'name'),
							name: _.get(curData, 'name'),
							lonLatLoc: _.get(curData, 'lonLatLoc'),
							alt: parseFloat(_.get(curData, 'alt')),
							hdg: parseFloat(_.get(curData, 'hdg')),
							speed: parseFloat(_.get(curData, 'speed', 0)),
							inAir: _.get(curData, 'inAir'),
							playername: _.get(curData, 'playername', ''),
							groupId: _.get(curData, 'groupId', 0),
							unitId: _.get(curData, 'unitId', 0),
							dead: false
						}
					};
					if(_.get(curData, 'type')) {
						_.set(iCurObj, 'data.type', _.get(curData, 'type'));
					}
					if(_.get(curData, 'coalition')) {
						_.set(iCurObj, 'data.coalition', _.get(curData, 'coalition'));
					} else {
						_.set(iCurObj, 'data.coalition', curUnit.coalition);
					}
					if(_.get(curData, 'country')) {
						_.set(iCurObj, 'data.country', _.get(curData, 'country'));
					}

					dbMapServiceController.unitActions('update', serverName, iCurObj.data)
						.then(function () {
							webPushCommands.sendToCoalition(serverName, {payload: _.cloneDeep(iCurObj)});
							//curServers[serverName].updateQue['q' + _.get(curUnit, ['coalition'])].push(_.cloneDeep(iCurObj));
							//curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
						})
						.catch(function (err) {
							console.log('update err line626: ', err);
						})
					;
				}else if (_.get(unitObj, 'action') === 'C') {
					//console.log('CREATE: ', _.get(unitObj, 'data'));

					_.set(curData, '_id', _.get(curData, 'name'));
					iCurObj = {
						action: 'C',
						sessionName: sessionName,
						data: curData
					};
					if (curData.category === 'STRUCTURE') {
						if( _.includes(curData.name, ' Logistics')) {
							_.set(curData, 'proxChkGrp', 'logisticTowers');
						}
					}

					dbMapServiceController.unitActions('save', serverName, iCurObj.data)
						.then(function (unit) {
							webPushCommands.sendToCoalition(serverName, {payload: _.cloneDeep(iCurObj)});
							//curServers[serverName].updateQue['q' + parseFloat(_.get(unitObj, 'data.coalition'))].push(_.cloneDeep(iCurObj));
							//curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
						})
						.catch(function (err) {
							console.log('save err line95: ', err);
						})
					;

				} else if (_.get(unitObj, 'action') === 'D') {
					/*
                    if (_.get(ewrUnitsActivated, [curUnitName], false)) {
                        console.log('Delete ewr for: ', curUnitName );
                        _.set(ewrUnitsActivated, [curUnitName], false);
                    }
                    */
					if (_.get(curData, 'name')) {
						iCurObj = {
							action: 'D',
							sessionName: sessionName,
							data: {
								_id: _.get(curData, 'name'),
								name: _.get(curData, 'name'),
								troopType: null,
								virtCrateType: null,
								dead: true
							}
						};

						if(_.get(curData, 'coalition')) {
							_.set(iCurObj, 'data.coalition', _.get(curData, 'coalition'));
						} else {
							_.set(iCurObj, 'data.coalition', curUnit.coalition);
						}

						dbMapServiceController.unitActions('update', serverName, iCurObj.data)
							.then(function (unit) {
								webPushCommands.sendToCoalition(serverName, {payload: _.cloneDeep(iCurObj)});
								// curServers[serverName].updateQue.q1.push(_.cloneDeep(iCurObj));
								// curServers[serverName].updateQue.q2.push(_.cloneDeep(iCurObj));
								// curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
							})
							.catch(function (err) {
								console.log('del err line123: ', err);
							})
						;
					} else {
						console.log('is not a number: ', _.get(curData, 'unitId'), curData);
					}
				}
			}
		})
		.catch(function (err) {
			console.log('err line129: ', err);
		})
	;
});
