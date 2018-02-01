const _ = require('lodash');
const dbMapServiceController = require('../db/dbMapService');
const taskController = require('../action/task');

_.set(exports, 'processUnitUpdates', function (serverName, sessionName, unitObj) {
	dbMapServiceController.unitActions('read', serverName, {_id: _.get(unitObj, 'data.unitId')})
		.then(function (unit) {
			var stParse;
			var iCurObj;
			var curUnit = _.get(unit, 0, {});
			var curUnitName = _.get(curUnit, 'name');
			var curData = _.get(unitObj, 'data');
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
						_id: parseFloat(_.get(unitObj, 'data.unitId')),
						unitId: _.get(unitObj, 'data.unitId'),
						lonLatLoc: _.get(unitObj, 'data.lonLatLoc'),
						alt: parseFloat(_.get(unitObj, 'data.alt')),
						hdg: parseFloat(_.get(unitObj, 'data.hdg')),
						speed: parseFloat(_.get(unitObj, 'data.speed', 0)),
						inAir: _.get(unitObj, 'data.inAir'),
						playername: _.get(unitObj, 'data.playername', ''),
						dead: false
					}
				};

				dbMapServiceController.unitActions('update', serverName, iCurObj.data)
					.then(function () {
						//curServers[serverName].updateQue['q' + _.get(curUnit, ['coalition'])].push(_.cloneDeep(iCurObj));
						//curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
					})
					.catch(function (err) {
						console.log('update err line626: ', err);
					})
				;
			}else if (_.get(unitObj, 'action') === 'C') {
				//console.log('CREATE: ', _.get(unitObj, 'data'));

				_.set(curData, '_id', _.get(curData, 'unitId'));
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
						//curServers[serverName].updateQue['q' + parseFloat(_.get(unitObj, 'data.coalition'))].push(_.cloneDeep(iCurObj));
						//curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
					})
					.catch(function (err) {
						console.log('save err line95: ', err);
					})
				;

			} else if (_.get(unitObj, 'action') === 'D') {
				//console.log('DELETE: ', _.get(unitObj, 'data'));
				/*
                if (_.get(ewrUnitsActivated, [curUnitName], false)) {
                    console.log('Delete ewr for: ', curUnitName );
                    _.set(ewrUnitsActivated, [curUnitName], false);
                }
                */
				if (_.isNumber(parseFloat(_.get(unitObj, 'data.unitId')))) {
					iCurObj = {
						action: 'D',
						sessionName: sessionName,
						data: {
							_id: parseFloat(_.get(unitObj, 'data.unitId')),
							unitId: _.get(unitObj, 'data.unitId'),
							troopType: null,
							virtCrateType: null,
							dead: true
						}
					};

					dbMapServiceController.unitActions('update', serverName, iCurObj.data)
						.then(function (unit) {
							// curServers[serverName].updateQue.q1.push(_.cloneDeep(iCurObj));
							// curServers[serverName].updateQue.q2.push(_.cloneDeep(iCurObj));
							// curServers[serverName].updateQue.qadmin.push(_.cloneDeep(iCurObj));
						})
						.catch(function (err) {
							console.log('del err line123: ', err);
						})
					;
				} else {
					console.log('is not a number: ', _.get(unitObj, 'data.unitId'));
				}
			}
		})
		.catch(function (err) {
			console.log('err line129: ', err);
		})
	;
});
