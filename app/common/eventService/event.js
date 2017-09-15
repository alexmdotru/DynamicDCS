(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var ePromise;
		_.set(eCtrl, 'events', {});
		_.set(eCtrl, 'loaded', false);

		_.set(eCtrl, 'byUcid', function (newEvents) {
			var curiPlayer;
			var curtPlayer;
			var scoreMath;
			var curScore = {};
			var name;
			var sortedEvents = _.sortBy(newEvents, ['createdAt']);
			_.forEach(sortedEvents, function (event) {
				curiPlayer = _.get(event, 'iucid');
				curtPlayer = _.get(event, 'tucid');
				if (curiPlayer || curtPlayer) {
					if (curiPlayer) {
						_.set(eCtrl, ['events', curiPlayer, 'data'], _.get(eCtrl, ['events', curiPlayer, 'data'], []));
						if (!_.get(eCtrl, ['events', curiPlayer, 'name'])) {
							_.set(eCtrl, ['events', curiPlayer, 'name'], _.get(event, 'iName'));
							_.set(eCtrl, ['events', curiPlayer, 'id'], _.get(event, 'iName'));
						}
						scoreMath = _.get(curScore, [curiPlayer], 0) + _.get(event, 'score', 0);
						if (scoreMath < 0) {
							scoreMath = 0;
						}
						_.set(curScore, [curiPlayer], scoreMath);
					} else {
						_.set(eCtrl, ['events', curtPlayer, 'data'], _.get(eCtrl, ['events', curtPlayer, 'data'], []));
						if (!_.get(eCtrl, ['events', curtPlayer], 'name')) {
							_.set(eCtrl, ['events', curtPlayer, 'name'], _.get(event, 'tName'));
							_.set(eCtrl, ['events', curtPlayer, 'id'], _.get(event, 'tName'));
						}
					}
					_.set(eCtrl, ['events', curiPlayer, 'marker'], {
						enabled: true,
						radius: 3
					});
					_.set(event, 'y',_.get(curScore, [curiPlayer], 0));
					_.set(event, 'x', new Date(_.get(event, 'createdAt')).getTime());
					if (curiPlayer) {
						eCtrl.events[curiPlayer].data.push(event);
					} else {
						eCtrl.events[curtPlayer].data.push(event);
					}
				}
			});
		});

		_.set(eCtrl, 'firstLoad', function () {
			if(_.get(ePromise, '$resolved') === undefined) {
				ePromise = eventAPI.query({serverName: 'dynamiccaucasus'});
				ePromise.$promise
					.then(function (eventData) {
						eCtrl.byUcid(eventData);
						_.set(eCtrl, 'loaded', true);
					})
					.catch(function(err){
						alertService.addAlert('danger', 'Events could not be queryed.');
						console.log(err);
					})
				;
			}
			return ePromise;
		});

		_.set(eCtrl, 'loadVarCheck', function (loadVar) {
			if(!_.get(eCtrl, 'loaded', false)) {
				return eCtrl.firstLoad().$promise
					.then(function () {
						return _.get(eCtrl, loadVar);
					});
			}
			return _.get(eCtrl, loadVar)
		});

		_.set(eCtrl, 'getEvents', function () {
			return eCtrl.loadVarCheck('events');
		});
	}
	eventService.$inject = ['dynamic-dcs.api.srvEvent', 'alertService'];

	angular
		.module('dynamic-dcs.eventService',['dynamic-dcs.api.srvEvent', 'dynamic-dcs.alertService'])
		.service('eventService', eventService)
	;
})(angular);
