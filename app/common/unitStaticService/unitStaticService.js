(function (angular) {
	'use strict';

	function unitStaticService(unitStaticAPI, alertService) {
		var usCtrl = this;
		var usPromise;
		_.set(usCtrl, 'loaded', false);
		_.set(usCtrl, 'firstLoad', function () {
			if(_.get(usPromise, '$resolved') === undefined) {
				usPromise = unitStaticAPI.get();
				usPromise.$promise
					.then(function (unitStaticData) {
						_.set(tCtrl, 'unitStatic', unitStaticData);
						_.set(tCtrl, 'loaded', true);
					})
					.catch(function(err){
						alertService.addAlert('danger', 'unitStatic could not be queryed.');
						console.log(err);
					})
				;
			}
			return usPromise;
		});

		_.set(tCtrl, 'loadVarCheck', function (loadVar) {
			if(!_.get(usCtrl, 'loaded', false)) {
				return usCtrl.firstLoad().$promise
					.then(function () {
						return _.get(usCtrl, loadVar);
					});
			}
			return _.get(tCtrl, loadVar)
		});

		_.set(tCtrl, 'getUnitStatics', function () {
			return usCtrl.loadVarCheck('unitStatic');
		});
	}
	unitStaticService.$inject = ['dynamic-dcs.api.unitStatic', 'alertService'];

	angular
		.module('dynamic-dcs.unitStaticService',['dynamic-dcs.alertService'])
		.service('unitStaticService', unitStaticService)
	;
})(angular);
