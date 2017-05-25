(function (angular) {
	'use strict';

	function chatBoxController (dynMsgService) {
		var cbt = this;
		_.set(cbt, 'dynMsgService', dynMsgService);
		console.log(cbt.dynMsgService);
	}
	chatBoxController.$injector = ['dynMsgService'];

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
