(function (angular) {
	'use strict';

	function srvPlayerService(DCSSrvPlayerAPI, alertService) {
		var sPlayer = this;
		// var srvPlayers;

		/*
		_.set(dSrv, 'createServer', function (server) {
			var dsave = DCSServerAPI.save(server);
			dsave.$promise
				.then(function(data) {
					alertService.addAlert('success', 'Server successfully created!');
					dSrv.readServer();
					return data;
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server could not be created.');
					console.log(err);
				})
			;
		});
		*/

		_.set(sPlayer, 'readServer', function (name) {
			var dread = DCSSrvPlayerAPI.query({name: name});
			dread.$promise
				.then(function(data) {
					_.set(sPlayer, 'srvPlayers', data);
					return data;
				})
				.catch(function(err){
					alertService.addAlert('danger', 'Server Players could not be queryed.');
					/* eslint-disable no-console */
					console.log(err);
					/* eslint-enable no-console */
				})
			;
		});

		/*
		_.set(dSrv, 'updateServer', function (server) {
			var dupdate = DCSServerAPI.update(server);
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

		_.set(dSrv, 'deleteServer', function (server) {
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


		_.set(sPlayer, 'init', function () {
			sPlayer.readServer();
		});
		 */
	}
	srvPlayerService.$inject = ['dynamic-dcs.api.srvPlayer', 'alertService'];
	/*
	function initializeSrvPlayerService (srvPlayerService) {
		srvPlayerService.init();
	}
	initializeSrvPlayerService.$inject = ['srvPlayerService'];
	*/
	angular
		.module('dynamic-dcs.srvPlayerService',['dynamic-dcs.api.srvPlayer', 'dynamic-dcs.alertService'])
		.service('srvPlayerService', srvPlayerService)
		//.run(initializeSrvPlayerService)
	;
})(angular);
