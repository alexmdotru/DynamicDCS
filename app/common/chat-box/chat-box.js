(function (angular) {
	'use strict';

	function chatBoxController ($timeout, dynMsgService) {
		var cbt = this;
		$timeout(function() {
			_.set(cbt, 'msgs', _.get(dynMsgService, ['cObj', cbt.socketSub]));
		});
	}
	chatBoxController.$injector = ['$timeout', 'dynMsgService'];
//['cObj', cbt.socketSub]
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
		.module('dynamic-dcs.chat-box', [
			'dynamic-dcs.dynMsgService'
		])
		.directive('chatBox', chatBox)
		.controller('chatBoxController', chatBoxController)
	;
}(angular));
//dmSrv, 'cObj.events'
//eventMsg
