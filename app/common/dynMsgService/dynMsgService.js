(function (angular) {
	'use strict';

	function dynMsgService () {
		var dmSrv = this;
	}
	dynMsgService.$inject = [];

	function initializedynMsgService (dynMsgService) {
		//dynMsgService.init();
	}
	initializedynMsgService.$inject = [
		'dynMsgService'
	];

	angular
		.module('dynamic-dcs.dynMsgService',[])
		.run(initializedynMsgService)
		.service('dynMsgService', dynMsgService)
	;
}(angular));
