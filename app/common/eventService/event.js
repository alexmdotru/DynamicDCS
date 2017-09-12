(function (angular) {
	'use strict';

	function eventService(eventAPI, alertService) {
		var eCtrl = this;
		var ePromise;
		_.set(eCtrl, 'loaded', false);
		_.set(eCtrl, 'firstLoad', function () {
			if(_.get(ePromise, '$resolved') === undefined) {
				ePromise = eventAPI.query({serverName: 'dynamiccaucasus'});
				ePromise.$promise
					.then(function (eventData) {
						_.set(eCtrl, 'events', _.get(eventData, 'events'));
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
