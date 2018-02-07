(function (angular) {
	'use strict';

	function unitStaticService(unitStaticAPI, gmapService, alertService) {
		var usCtrl = this;
		var usPromise;

		_.set(usCtrl, 'initUnitStatics', function (serverName) {
			usPromise = unitStaticAPI.query({serverName: serverName});
			usPromise.$promise
				.then(function (unitStaticData) {
					_.set(usCtrl, 'unitStatic', unitStaticData);
					gmapService.processAPICall(usCtrl.unitStatic);
				})
				.catch(function(err){
					alertService.addAlert('danger', 'unitStatic could not be queryed.');
					console.log(err);
				})
			;
		});
	}
	unitStaticService.$inject = ['dynamic-dcs.api.unitStatics', 'gmapService', 'alertService'];

	angular
		.module('dynamic-dcs.unitStaticService',['dynamic-dcs.api.unitStatics', 'dynamic-dcs.gmapService', 'dynamic-dcs.alertService'])
		.service('unitStaticService', unitStaticService)
	;
})(angular);
