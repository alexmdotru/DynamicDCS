(function (angular) {
	'use strict';

	function chatBoxController () {
		// var cbt = this;
		// $timeout, dynMsgService
		// $timeout(function() {
		//	_.set(cbt, 'msgs', _.get(dynMsgService, ['cObj', cbt.socketSub]));
		// });
		// '$timeout', 'dynMsgService'
	}
	chatBoxController.$injector = [];
	// ['cObj', cbt.socketSub]
	function chatBox() {
		return {
			restrict: 'E',
			scope: {
				socketSub: '@',
				chatTo: '@'
			},
			controller: 'chatBoxController',
			controllerAs: 'cbCtrl',
			bindToController: true,
			templateUrl: '/apps/dynamic-dcs/common/chat-box/chat-box.tpl.html'
		}
	}
	chatBox.$inject = [];

	angular
		.module('dynamic-dcs.chat-box', [])
		.directive('chatBox', chatBox)
		.controller('chatBoxController', chatBoxController)
	;
}(angular));
//dmSrv, 'cObj.events'
//eventMsg
