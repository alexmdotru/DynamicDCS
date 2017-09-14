(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var curScore = {};
		var ePromise;
		_.set(eCtrl, 'loaded', false);

		_.set(eCtrl, 'byUcid', function (events1) {
			var returnObj = {};
			var curPlayerId;
			var scoreMath;
			var events = _.cloneDeep(events1);
			events = _.sortBy(events, ['createdAt']);
			_.forEach(events, function (event) {
				if (_.get(event, 'iucid') || _.get(event, 'tucid')) {
					if (_.get(event, 'iucid')) {
						curPlayerId = _.get(event, 'iucid');
						scoreMath = _.get(curScore, [curPlayerId], 0) + _.get(event, 'score', 0);
						if(scoreMath < 0) {
							scoreMath = 0;
						}
						_.set(event, 'curScore', scoreMath);
						_.set(curScore, [curPlayerId], _.get(event, 'curScore', 0));
					} else {
						curPlayerId = _.get(event, 'tucid');
						_.set(event, 'curScore', _.get(curScore, [curPlayerId], 0));
					}
					_.set(event, 'y', _.get(event, 'curScore'));
					_.set(event, 'x', new Date(_.get(event, 'createdAt')).getTime());
					_.set(returnObj, [curPlayerId, 'marker'], {
						enabled: true,
						radius: 3
					});
					_.set(returnObj, [curPlayerId, 'data'], _.get(returnObj, [curPlayerId, 'data'], []));
					console.log('rtnObj: ', _.get(returnObj, [curPlayerId, 'name']));
					if (_.get(returnObj, [curPlayerId, 'name'])) {
						console.log('FIRE1');
						if (_.get(event, 'iName')) {
							console.log('FIRE2');
							_.set(returnObj, [curPlayerId, 'name'], _.get(event, 'iName'));
						}
						if (_.get(event, 'tName')) {
							console.log('FIRE3');
							_.set(returnObj, [curPlayerId, 'name'], _.get(event, 'tName'));
						}
					}
					returnObj[curPlayerId].data.push(event);
				}
			});
			return returnObj;
		});

		_.set(eCtrl, 'firstLoad', function () {
			if(_.get(ePromise, '$resolved') === undefined) {
				ePromise = eventAPI.query({serverName: 'dynamiccaucasus'});
				ePromise.$promise
					.then(function (eventData) {
						_.set(eCtrl, 'events', eCtrl.byUcid(eventData));
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
