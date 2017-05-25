(function (angular) {
	'use strict';

	function chatBoxController (dynMsgService) {
		var cbt = this;
		_.set(cbt, 'msgs', _.get(dynMsgService, ['cObj', 'msgs']));

	}
	chatBoxController.$injector = ['dynMsgService'];
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
