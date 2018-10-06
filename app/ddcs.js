(function (angular) {
	'use strict';

	function dynamicDCSController($scope, $state, userAccountService, srvService, authService, alertService, $uibModal) {
		_.set(this, 'startPage', '/ddcs.tpl.html');
		_.set($scope, 'auth', authService);
		_.set($scope, 'animationsEnabled', true);
		_.set($scope, 'userAccountService', userAccountService);
		_.set($scope, 'alertService', alertService);
		_.set($scope, 'srvService', srvService);

		_.set($scope, 'openSettingsModal', function (size) {
			$uibModal.open({
				animation: $scope.animationsEnabled,
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: '/apps/ddcs/common/modals/settings/settingsModal.tpl.html',
				controller: 'settingsModalController',
				controllerAs: 'setCtrl',
				size: size
			});
		});

		_.set($scope, 'openAdminModal', function (size) {
			$uibModal.open({
				animation: $scope.animationsEnabled,
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: '/apps/ddcs/common/modals/admin/adminModal.tpl.html',
				controller: 'adminModalController',
				controllerAs: 'adminCtrl',
				size: size
			});
		});

		$scope.initialise = function() {
			_.set($scope, 'isCollapsed', true);
			_.set($scope, 'go', function(state) {
				$state.go(state);
			});
		};

		$scope.initialise();
	}
	dynamicDCSController.$inject = ['$scope','$state', 'userAccountService', 'srvService', 'authService', 'alertService', '$uibModal'];

	function settingsModalController($uibModalInstance, userAccountService) {
		var setCtrl = this;

		_.set(setCtrl, 'userAccountService', userAccountService);

		setCtrl.save = function () {
			/* eslint-disable no-console */
			console.log('save');
			/* eslint-enable no-console */
			$uibModalInstance.close('Save');
		};

		setCtrl.cancel = function () {
			/* eslint-disable no-console */
			console.log('cancel');
			/* eslint-enable no-console */
			$uibModalInstance.dismiss('Cancel');
		};
	}
	settingsModalController.$inject = ['$uibModalInstance', 'userAccountService'];

	function adminNewModalController($uibModalInstance, srvService) {
		var adminNewCtrl = this;
		_.set(adminNewCtrl, 'srvService', srvService);

		adminNewCtrl.save = function (server) {
			var curPayload = _.cloneDeep(server);
			_.set(curPayload, '_id', _.cloneDeep(server.name));
			srvService.createServer(curPayload);
			$uibModalInstance.dismiss('Cancel');
		};

		adminNewCtrl.close = function () {
			$uibModalInstance.dismiss('Cancel');
		};
	}
	adminNewModalController.$inject = ['$uibModalInstance','srvService'];

	function adminDeleteModalController($uibModalInstance, srvService, server) {
		var adminDeleteCtrl = this;
		_.set(adminDeleteCtrl, 'srvService', srvService);

		adminDeleteCtrl.delete = function () {
			srvService.deleteServer(server);
			$uibModalInstance.dismiss('Cancel');
		};

		adminDeleteCtrl.close = function () {
			$uibModalInstance.dismiss('Cancel');
		};
	}
	adminDeleteModalController.$inject = ['$uibModalInstance','srvService', 'serverid'];

	function adminModalController($scope, $uibModal, $uibModalInstance, srvService, theaterService) {

		var adminCtrl = this;
		_.set(adminCtrl, 'srvService', srvService);
		_.set(adminCtrl, 'DDCSTheaters', _.get(theaterService, 'theaters'));

		adminCtrl.save = function (server) {
			var curPayload = _.cloneDeep(server);
			srvService.updateServer(curPayload);
		};

		adminCtrl.close = function () {
			$uibModalInstance.dismiss('Cancel');
		};

		_.set(adminCtrl, 'openNewAdminModal', function (size) {
			$uibModal.open({
				animation: $scope.animationsEnabled,
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: '/apps/ddcs/common/modals/admin/adminNewModal.tpl.html',
				controller: 'adminNewModalController',
				controllerAs: 'adminNewCtrl',
				size: size
			});
		});
		_.set(adminCtrl, 'openDeleteAdminModal', function (size, server) {
			$uibModal.open({
				animation: $scope.animationsEnabled,
				ariaLabelledBy: 'modal-title',
				ariaDescribedBy: 'modal-body',
				templateUrl: '/apps/ddcs/common/modals/admin/adminDeleteModal.tpl.html',
				controller: 'adminDeleteModalController',
				controllerAs: 'adminDeleteCtrl',
				size: size,
				resolve: {
					serverid: function() {
						return server
					}
				}
			});
		});
	}
	adminModalController.$inject = ['$scope', '$uibModal', '$uibModalInstance', 'srvService', 'theaterService'];

	angular
		.module('ddcs', [
			'ddcs.templates',
			'ddcs.authService',
			'ddcs.chat-box',
			'ddcs.api.server',
			'ddcs.theaterService',
			'ddcs.eventService',
			'ddcs.alertService',
			'ddcs.srvService',
			'ddcs.userAccountService',
			'states',
			'ui.bootstrap',
			'ngAnimate',
			'ngSanitize',
			'ddcs.socketFactory'
		])
		.config(['$qProvider', function ($qProvider) {
			$qProvider.errorOnUnhandledRejections(false);
		}])
		.controller('dynamicDCSController', dynamicDCSController)
		.controller('settingsModalController', settingsModalController)
		.controller('adminModalController', adminModalController)
		.controller('adminNewModalController', adminNewModalController)
		.controller('adminDeleteModalController', adminDeleteModalController)
	;

}(angular));
