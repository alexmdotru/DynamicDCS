(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
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
				if (!_.get(event, 'createdAt')) {
					_.set(event, 'createdAt', new Date().toISOString());
				}
				curiPlayer = _.get(event, 'iucid');
				curtPlayer = _.get(event, 'tucid');
				if (curiPlayer || curtPlayer) {
					if (curiPlayer) {
						_.set(eCtrl, ['events', curiPlayer, 'data'], _.get(eCtrl, ['events', curiPlayer, 'data'], []));
						if (!_.get(eCtrl, ['events', curiPlayer, 'name'])) {
							_.set(eCtrl, ['curScore', curiPlayer, 'name'], _.get(event, 'iName'))
						}
						if (!_.get(eCtrl, ['events', curiPlayer, 'name'])) {
							_.set(eCtrl, ['events', curiPlayer, 'name'], _.get(event, 'iName'));
							_.set(eCtrl, ['events', curiPlayer, 'id'], _.get(event, 'iName'));
						}
						scoreMath = _.get(eCtrl, ['curScore', curiPlayer, 'score'], 0) + _.get(event, 'score', 0);
						if (scoreMath < 0) {
							scoreMath = 0;
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
					_.set(eCtrl, ['events', curiPlayer, 'marker'], {
						enabled: true,
						radius: 3
					});
					_.set(event, 'y',_.get(eCtrl, ['curScore', curiPlayer, 'score'], 0));
					_.set(event, 'x', new Date(_.get(event, 'createdAt')).getTime());
					if (curiPlayer) {
						eCtrl.events[curiPlayer].data.push(event);
					} else {
						eCtrl.events[curtPlayer].data.push(event);
					}
				}
			});
			_.forEach(_.get(eCtrl, 'events'), function (val, key) {
				_.set(eCtrl, ['events', key], _.sortBy(val, 'x'));
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
