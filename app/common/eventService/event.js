(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var curDate = new Date().toISOString();
		// var curTimeEpoc = new Date().getTime();
		var ePromise;
		_.set(eCtrl, 'curScore', {});
		_.set(eCtrl, 'setTopScore', function (usrObj) {
			_.set(eCtrl, 'topScore', _.get(eCtrl, 'topScore', []));
			var curUsr = _.find(_.get(eCtrl, 'topScore'), {id: _.get(usrObj, 'id')});
			if (curUsr) {
				_.set(curUsr, 'score', _.get(usrObj, 'score'))
			} else {
				eCtrl.topScore.push(usrObj);
			}
			_.set(eCtrl, 'topScore', _.sortBy(_.values(_.get(eCtrl, 'topScore')), 'score')
				.reverse());
		});
		_.set(eCtrl, 'byUcid', function (newEvents) {
			var eventObj = {};
			var scoreMath;
			var sortedEvents = _.sortBy(newEvents, ['createdAt']);

			_.forEach(sortedEvents, function (event) {
				var eventTime;
				var curPlayer;
				var newPlayer = false;
				var simpleArray = {};
				var cTime = _.get(event, 'createdAt');
				if (cTime) {
					eventTime = new Date(_.get(event, 'createdAt')).getTime();
				} else {
					eventTime = new Date().getTime();
				}
				if (!_.get(event, 'createdAt')) {
					_.set(event, 'createdAt', curDate);
				}

				if (_.get(event, 'iucid')) {
					if (_.get(event, 'iucid')) {
						curPlayer = _.get(event, 'iucid');
						scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0) +
							_.get(event, 'score', 0);
					} else {
						curPlayer = _.get(event, 'tucid');
						scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0);
					}
					if (scoreMath < 0) {
						scoreMath = 0;
					}

					_.set(eCtrl, ['curScore', curPlayer, 'id'], curPlayer);
					_.set(eCtrl, ['curScore', curPlayer, 'score'], scoreMath);

					if (!_.get(eventObj, [curPlayer])) {
						newPlayer = true;
					}

					if (curPlayer) {
						_.set(eventObj, [curPlayer, 'id'], curPlayer);
						_.set(
							eventObj,
							[curPlayer, 'data'],
							_.get(eventObj, [curPlayer, 'data'], [])
						);
						if (!_.get(eventObj, [curPlayer, 'name'])) {
							_.set(eventObj, [curPlayer, 'name'], _.get(event, 'iName'));
							_.set(eCtrl, ['curScore', curPlayer, 'name'], _.get(event, 'iName'))
						}
					}
					if (newPlayer) {
						eventObj[curPlayer].data.push({
							x: eventTime - 1000,
							y: 0,
							msg: '',
							score: 0,
							shadow: false,
							boostThreshold: 500
						});
					}

					_.set(eventObj, [curPlayer, 'shadow'], false);
					_.set(eventObj, [curPlayer, 'boostThreshold'], 500);
					_.set(simpleArray, 'y', scoreMath);
					_.set(simpleArray, 'x', eventTime);
					_.set(simpleArray, 'msg', _.get(event, 'msg'));
					_.set(simpleArray, 'score', _.get(event, 'score', 0));
					if(_.get(event, 'score', 0) && _.get(event, 'iucid')){
						eventObj[curPlayer].data.push(simpleArray);
					}
				}
			});
			_.forEach(_.get(eCtrl, 'curScore'), function (usr) {
				eCtrl.setTopScore(usr);
			});
			return eventObj;
		});
		_.set(eCtrl, 'getInitEvents', function () {
			ePromise = eventAPI.query({serverName: 'ddcsstandard'});
			return ePromise.$promise
				.then(function (eventData) {
					return eCtrl.byUcid(eventData);
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Events could not be queryed.');
					/* eslint-disable no-console */
					console.log(err);
					/* eslint-enable no-console */
				})
			;
		});
	}
	eventService.$inject = ['ddcs.api.srvEvent', 'alertService'];

	angular
		.module('ddcs.eventService',['ddcs.api.srvEvent', 'ddcs.alertService'])
		.service('eventService', eventService)
	;
})(angular);
