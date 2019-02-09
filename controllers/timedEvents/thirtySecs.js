const _ = require('lodash');
const masterDBController = require('../db/masterDB');
const jtacController = require('../action/jtac');
const menuUpdateController = require('../menu/menuUpdate');
const groupController = require('../spawn/group');
const troopLocalizerController = require('../action/troopLocalizer');
const userLivesController = require('../action/userLives');
const weaponComplianceController = require('../action/weaponCompliance');
const neutralCCController = require('../action/neutralCC');

var AIMaxIdleTime = (5 * 60 * 1000); // 5 mins
var maxCrateLife = (3 * 60 * 60 * 1000); // 3 hrs

_.set(exports, 'processThirtySecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		masterDBController.unitActions('removeAllDead', serverName, {})
			.catch(function (err) {
				console.log('err line12: ', err);
			})
		;

		userLivesController.checkAircraftCosts(serverName);

		weaponComplianceController.checkAircraftWeaponCompliance(serverName);

		jtacController.aliveJtac30SecCheck(serverName);
		// troopLocalizerController.checkTroopProx(serverName);

		neutralCCController.checkCmdCenters(serverName);

		//cleanupAI AIMaxIdleTime
		masterDBController.unitActions('read', serverName, {isAI: true, dead:false})
			.then(function (AICleanup) {
				_.forEach(AICleanup, function (AIUnit) {
					if (_.isEmpty(AIUnit.playername) && new Date(_.get(AIUnit, 'updatedAt', 0)).getTime() + AIMaxIdleTime < new Date().getTime()) {
						groupController.destroyUnit( serverName, AIUnit.name );
					}
				});
			})
			.catch(function (err) {
				console.log('err line20: ', err);
			})
		;

		masterDBController.staticCrateActions('readStd', serverName, {})
			.then(function (crateCleanup) {
				_.forEach(crateCleanup, function (crate) {
					if (new Date(_.get(crate, 'createdAt', 0)).getTime() + maxCrateLife < new Date().getTime()) {
						masterDBController.staticCrateActions('delete', serverName, {_id: crate._id})
							.then(function () {
								console.log('cleanup crate: ', crate.name);
								groupController.destroyUnit( serverName, crate.name );
							})
							.catch(function (err) {
								console.log('line 56: ', err);
							})
						;
					}
				});
			})
			.catch(function (err) {
				console.log('err line63: ', err);
			})
		;
	}
});
