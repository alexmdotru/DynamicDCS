(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var curScore = {};
		var ePromise;
		var events = {};
		_.set(eCtrl, 'loaded', false);

		_.set(eCtrl, 'byUcid', function (newEvents) {
			var curPlayer;
			var scoreMath;
			var curScore = {};
			var name;
			var sortedEvents = _.sortBy(newEvents, ['createdAt']);
			_.forEach(sortedEvents, function (event) {
				if (_.get(event, 'iucid') || _.get(event, 'tucid')) {
					if (_.get(event, 'iucid')) {
						curPlayer = _.get(events, [_.get(event, 'iucid')], {});
						if (!_.get(curPlayer, 'name')) {
							_.set(curPlayer, 'name', _.get(event, 'iName'));
							_.set(curPlayer, 'id', _.get(event, 'iName'));
						}
						scoreMath = _.get(curScore, [_.get(event, 'iucid')], 0) + _.get(event, 'score', 0);
						if (scoreMath < 0) {
							scoreMath = 0;
						}
						_.set(curPlayer, 'curScore', scoreMath);
						_.set(curScore, [_.get(event, 'iucid')], _.get(event, 'curScore', 0));
					} else {
						curPlayer = _.get(events, [_.get(event, 'tucid')], {});
						if (!_.get(curPlayer, 'name')) {
							_.set(curPlayer, 'name', _.get(event, 'tName'));
							_.set(curPlayer, 'id', _.get(event, 'tName'));
						}
					}
					_.set(curplayer, 'marker', {
						enabled: true,
						radius: 3
					});
					_.set(event, 'y', _.get(event, 'curScore'));
					_.set(event, 'x', new Date(_.get(event, 'createdAt')).getTime());
					_.set(curPlayer, 'data', _.get(curPlayer, 'data', []));
					curPlayer.data.push(event);
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
