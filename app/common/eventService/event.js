(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var curDate = new Date().toISOString();
		var curTimeEpoc = new Date().getTime();
		var ePromise;
		// _.set(eCtrl, 'events', {});
		_.set(eCtrl, 'curScore', {});

		_.set(eCtrl, 'byUcid', function (newEvents) {
			var eventObj = {};
			var scoreMath;
			var name;
			var sortedEvents = _.sortBy(newEvents, ['createdAt']);

			_.forEach(sortedEvents, function (event) {
				var eventTime;
				var curPlayer;
				var simpleArray = {};
				var simpleFlags = {};
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
					curPlayer = _.get(event, 'iucid');
					scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0) + _.get(event, 'score', 0);
				} else {
					curPlayer = _.get(event, 'tucid');
					scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0);
				}
				if (scoreMath < 0) {
					scoreMath = 0;
				}
				_.set(eCtrl, ['curScore', curPlayer, 'score'], scoreMath);

				if (curPlayer) {
					_.set(eventObj, [curPlayer, 'id'], curPlayer);
					_.set(eventObj, [curPlayer, 'data'], _.get(eCtrl, ['eventObj', curPlayer, 'data'], []));
					if (!_.get(eventObj, [curPlayer, 'name'])) {
						_.set(eventObj, [curPlayer, 'name'], _.get(event, 'iName'));
						_.set(eCtrl, ['curScore', curPlayer, 'name'], _.get(event, 'iName'))
					}
				}
				_.set(eventObj, [curPlayer, 'marker'], {
					enabled: true,
					radius: 3
				});
				_.set(eventObj, [curPlayer, 'shadow'], false);
				_.set(eventObj, [curPlayer, 'boostThreshold'], 500);
				_.set(simpleArray, 'y', scoreMath);
				_.set(simpleArray, 'x', eventTime);
				_.set(simpleArray, 'msg', _.get(event, 'msg'));
				_.set(simpleArray, 'score', _.get(event, 'score', 0));

				_.set(simpleFlags, 'x', eventTime);
				_.set(simpleFlags, 'title', _.get(event, 'eventCode'));
				_.set(simpleFlags, 'text', _.get(event, 'msg'));
				eventObj[curPlayer].data.push(simpleArray);
				// eCtrl.events[curPlayer].data.push(simpleArray);
				// eCtrl.events[curPlayer+'F'].data.push(simpleFlags);
			});

			_.set(eCtrl, 'topScore', _.sortBy(_.values(_.get(eCtrl, 'curScore')), 'score').reverse());
			return eventObj;
			/*
			// drag line to the end
			_.forEach(eCtrl.events, function (player) {
				eCtrl.events[_.get(player, 'id')].data.push({
					y: _.get(eCtrl, ['curScore', _.get(player, 'id'), 'score']),
					x: curTimeEpoc,
					msg: '',
					score: 0
				});
			});
			*/
		});

		_.set(eCtrl, 'getInitEvents', function () {
			ePromise = eventAPI.query({serverName: 'dynamiccaucasus'});
			return ePromise.$promise
				.then(function (eventData) {
					return eCtrl.byUcid(eventData);
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Events could not be queryed.');
					console.log(err);
				})
			;
		});
	};
	eventService.$inject = ['dynamic-dcs.api.srvEvent', 'alertService'];

	angular
		.module('dynamic-dcs.eventService',['dynamic-dcs.api.srvEvent', 'dynamic-dcs.alertService'])
		.service('eventService', eventService)
	;
})(angular);
