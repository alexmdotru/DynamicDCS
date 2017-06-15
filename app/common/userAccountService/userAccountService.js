(function (angular) {
	'use strict';

	function userAccountService(DCSUserAccountsAPI, alertService) {
		var uASrv = this;

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
		/*
		_.set(uASrv, 'disableUser', function (userAccount) {
			var ddelete = DCSServerAPI.delete(server);
			ddelete.$promise
				.then(function(data) {
					alertService.addAlert('success', 'Server has been successfully deleted!');
					dSrv.readServer();
					return data;
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server options could not be updated.');
					console.log(err);
				})
			;
		});
		*/
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
