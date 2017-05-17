(function (angular) {
	'use strict';

	function chatBoxController () {
		var cbt = this;

	}
	chatBoxController.$injector = [];

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
