(function (angular) {
	'use strict';

	function alertService() {

		var alertCtrl = this;
		_.set(alertCtrl, 'alerts', []);

		_.set(alertCtrl, 'addAlert', function(type, msg) {
			alertCtrl.alerts.push({type: type, msg: msg});
		});

		_.set(alertCtrl, 'closeAlert', function(index) {
			alertCtrl.alerts.splice(index, 1);
		});
	}
	alertService.$inject = [];

	angular
		.module('ddcs.alertService',[])
		.service('alertService', alertService)
	;
})(angular);
