(function (angular) {
	'use strict';

	function userAccountService(DCSUserAccountsAPI, alertService) {
		var uASrv = this;
		var userAccounts;
		var localAccount;
		_.set(uASrv, 'createUser', function (userAccount) {
			var dsave = DCSUserAccountsAPI.save(userAccount);
			dsave.$promise
				.then(function(data) {
					alertService.addAlert('success', 'User Account successfully created!');
					uASrv.readUser();
					return data;
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server could not be created.');
					console.log(err);
				})
			;
		});

		_.set(uASrv, 'readUser', function () {
			var dread = DCSUserAccountsAPI.query();
			dread.$promise
				.then(function(data) {
					_.set(uASrv, 'userAccounts', data);
					_.set(uASrv, 'localAccount', _.find(data, {authId: localStorage.getItem('sub')}));
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server service could not be queryed.');
					console.log(err);
				})
			;
		});

		_.set(uASrv, 'updateServer', function (userAccount) {
			var dupdate = DCSUserAccountsAPI.update(userAccount);
			dupdate.$promise
				.then(function(data) {
					alertService.addAlert('success', 'Server options successfully saved!');
					return data;
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server options could not be updated.');
					console.log(err);
				})
			;
		});
		_.set(uASrv, 'checkUserAccount', function (profile) {
			var dsave = DCSUserAccountsAPI.checkUserAccount(profile);
			dsave.$promise
				.then(function(data) {
					uASrv.readUser();
					return data;
				})
				.catch(function(err){
					console.log(err);
				})
			;
		});

		_.set(uASrv, 'init', function () {
			uASrv.readUser();
		});
	}
	userAccountService.$inject = ['dynamic-dcs.api.userAccounts', 'alertService'];

	function initializeUserAccountServiceService (userAccountService) {
		userAccountService.init();
	}
	initializeUserAccountServiceService.$inject = ['userAccountService'];

	angular
		.module('dynamic-dcs.userAccountService',['dynamic-dcs.api.userAccounts', 'dynamic-dcs.alertService'])
		.service('userAccountService', userAccountService)
		.run(initializeUserAccountServiceService)
	;
})(angular);
