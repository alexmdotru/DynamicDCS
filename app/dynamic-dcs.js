(function (angular) {
	'use strict';

	function dynamicDCSController($scope, $state, dynMsgService, authService, $uibModal) {
		_.set(this, 'startPage', '/dynamic-dcs.tpl.html');

		_.set($scope, 'auth', authService);
		/*
		_.set($scope, 'profile', {});

		if (authService.getCachedProfile()) {
			_.set($scope, profile, authService.getCachedProfile());
		} else {
			authService.getProfile(function(err, profile) {
				_.set($scope, profile, profile);
			});
		}
		*/

		_.set($scope, 'animationsEnabled', true);

		_.set($scope, 'openSettingsModal', function (size) {
			var modalInstance = $uibModal.open({
				animation: $scope.animationsEnabled,
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: '/apps/dynamic-dcs/common/modals/settings/settingsModal.tpl.html',
				controller: 'settingsModalController',
				controllerAs: 'setCtrl',
				size: size
			});

			modalInstance.result
				.then(function (selectedItem) {
					console.log('sel',selectedItem);
				}, function () {
					console.log('Modal dismissed at: ' + new Date());
				});
		});

		$scope.initialise = function() {

			_.set($scope, 'isCollapsed', true);
			_.set($scope, 'go', function(state) {
				$state.go(state);
			});
			_.set($scope, 'tabData', [
				{
					heading: 'Leaderboard',
					route:   'index'
				},
				{
					heading: 'DynamicCaucasus',
					route:   'dynCaucasus'
				},
				{
					heading: 'DynamicRedDawn',
					route:   'dynRedDawn'
				}
			]);
			_.set($scope, 'cObj', _.get(dynMsgService, 'cObj'));
		};

		$scope.initialise();
	}
	dynamicDCSController.$inject = ['$scope','$state', 'dynMsgService', 'authService', '$uibModal'];

	function settingsModalController($uibModalInstance) {
		var setCtrl = this;
		setCtrl.save = function () {
			console.log('save');
			$uibModalInstance.close('Save');
		};

		setCtrl.cancel = function () {
			console.log('cancel');
			$uibModalInstance.dismiss('Cancel');
		};
	}
	settingsModalController.$inject = ['$uibModalInstance'];

	angular
		.module('dynamic-dcs', [
			'dynamic-dcs.templates',
			'dynamic-dcs.dynMsgService',
			'dynamic-dcs.chat-box',
			'states',
			'ui.bootstrap',
			'dynamic-dcs.authService',
			'ngAnimate',
			'ngSanitize'
		])
		.config(['$qProvider', function ($qProvider) {
			$qProvider.errorOnUnhandledRejections(false);
		}])
		.controller('dynamicDCSController', dynamicDCSController)
		.controller('settingsModalController', settingsModalController)
	;

}(angular));
