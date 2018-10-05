(function (angular) {
	'use strict';

	function theaterService(theaterAPI, alertService) {
		var tCtrl = this;
		var tPromise;
		_.set(tCtrl, 'loaded', false);
		_.set(tCtrl, 'firstLoad', function () {
			if(_.get(tPromise, '$resolved') === undefined) {
				tPromise = theaterAPI.get();
				tPromise.$promise
					.then(function (theaterData) {
						_.set(tCtrl, 'theaters', _.get(theaterData, 'theaters'));
						_.set(tCtrl, 'loaded', true);
					})
					.catch(function(err){
						alertService.addAlert('danger', 'Theaters could not be queryed.');
						/* eslint-disable no-console */
						console.log(err);
						/* eslint-enable no-console */
					})
				;
			}
			return tPromise;
		});

		_.set(tCtrl, 'loadVarCheck', function (loadVar) {
			if(!_.get(tCtrl, 'loaded', false)) {
				return tCtrl.firstLoad().$promise
					.then(function () {
						return _.get(tCtrl, loadVar);
					});
			}
			return _.get(tCtrl, loadVar)
		});

		_.set(tCtrl, 'getTheaters', function () {
			return tCtrl.loadVarCheck('theaters');
		});
	}
	theaterService.$inject = ['dynamic-dcs.api.theater', 'alertService'];

	angular
		.module('dynamic-dcs.theaterService',['dynamic-dcs.api.theater', 'dynamic-dcs.alertService'])
		.service('theaterService', theaterService)
	;
})(angular);
