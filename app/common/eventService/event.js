(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var curDate = new Date().toISOString();
		var ePromise;
		_.set(eCtrl, 'events', {});
		_.set(eCtrl, 'curScore', {});

		_.set(eCtrl, 'byUcid', function (newEvents) {
			var curiPlayer;
			var curtPlayer;
			var scoreMath;
			var name;
			var sortedEvents = _.sortBy(newEvents, ['createdAt']);

			_.forEach(sortedEvents, function (event) {
				var eventTime = new Date(_.get(event, 'createdAt')).getTime();
				var curPlayer;
				var simpleArray = {};
				var simpleFlags = {};
				if (!_.get(event, 'createdAt')) {
					_.set(event, 'createdAt', curDate);
				}
				if (_.get(event, 'iucid')) {
					curPlayer = _.get(event, 'iucid');
					scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0) + _.get(event, 'score', 0);
					if (scoreMath < 0) {
						scoreMath = 0;
					}
				} else {
					curPlayer = _.get(event, 'tucid');
					scoreMath = _.get(eCtrl, ['curScore', curPlayer, 'score'], 0);
				}

				if (curPlayer) {
					_.set(eCtrl, ['events', curPlayer, 'id'], curPlayer);
					_.set(eCtrl, ['events', curPlayer, 'data'], _.get(eCtrl, ['events', curPlayer, 'data'], []));
					if (!_.get(eCtrl, ['events', curPlayer, 'name'])) {
						_.set(eCtrl, ['curScore', curPlayer, 'name'], _.get(event, 'iName'))
					}
				}


/*
					if (curiPlayer) {
						_.set(eCtrl, ['events', curiPlayer, 'data'], _.get(eCtrl, ['events', curiPlayer, 'data'], []));

						if (!_.get(eCtrl, ['events', curiPlayer, 'name'])) {
							_.set(eCtrl, ['events', curiPlayer, 'name'], _.get(event, 'iName'));
							_.set(eCtrl, ['events', curiPlayer, 'id'], _.get(event, 'iName'));
						}

						_.set(eCtrl, ['curScore', curiPlayer, 'score'], scoreMath);
					} else {
						_.set(eCtrl, ['events', curtPlayer, 'data'], _.get(eCtrl, ['events', curtPlayer, 'data'], []));
						if (!_.get(eCtrl, ['events', curtPlayer, 'name'])) {
							_.set(eCtrl, ['curScore', curtPlayer, 'name'], _.get(event, 'tName'))
						}
						if (!_.get(eCtrl, ['events', curtPlayer], 'name')) {
							_.set(eCtrl, ['events', curtPlayer, 'name'], _.get(event, 'tName'));
							_.set(eCtrl, ['events', curtPlayer, 'id'], _.get(event, 'tName'));
						}
					}
*/
				_.set(eCtrl, ['events', curPlayer, 'marker'], {
					enabled: true,
					radius: 3
				});
				_.set(eCtrl, ['events', curPlayer, 'shadow'], false);
				_.set(eCtrl, ['events', curPlayer, 'boostThreshold'], 500);
				_.set(simpleArray, 'y',_.get(eCtrl, ['curScore', curPlayer, 'score'], 0));
				_.set(simpleArray, 'x', eventTime);
				_.set(simpleArray, 'msg', _.get(event, 'msg'));
				_.set(simpleArray, 'score', _.get(event, 'score', 0));

				_.set(simpleFlags, 'x', eventTime);
				_.set(simpleFlags, 'title', _.get(event, 'eventCode'));
				_.set(simpleFlags, 'text', _.get(event, 'msg'));
				eCtrl.events[curPlayer].data.push(simpleArray);
			});
			_.set(eCtrl, 'topScore', _.sortBy(_.values(_.get(eCtrl, 'curScore')), 'score').reverse());
		});

		_.set(eCtrl, 'getInitEvents', function () {
			ePromise = eventAPI.query({serverName: 'dynamiccaucasus'});
			ePromise.$promise
				.then(function (eventData) {
					eCtrl.byUcid(eventData);
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
