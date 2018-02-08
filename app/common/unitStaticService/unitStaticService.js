(function (angular) {
	'use strict';

	function unitStaticService($q, unitStaticAPI, basesAPI) {
		var us = this;
		_.assign(us, {
			loaded: false,
			ckBasesLoad: function (serverName) {
				var bases = basesAPI.query({serverName: serverName})
					.$promise
					.$then(function(response) {
						_.set(us, 'bases', response);
						return response;
					})
					.catch(function(err){
						console.log('line16', err);
					})
				;
			},
			ckUnitsStaticsLoad: function (serverName) {
				var unitsStatics = unitStaticAPI.query({serverName: serverName})
					.$promise
					.$then(function(response) {
						_.set(us, 'unitStatics', response);
						return response;
					})
					.catch(function(err){
						console.log('line28', err);
					})
				;
			},
			init: function (serverName) {
				var bases = basesAPI.query({serverName: serverName})
					.$promise
					.then(function(response) {
						_.set(us, 'bases', response);
						return response;
					})
				;
				var unitsStatics = unitStaticAPI.query({serverName: serverName})
					.$promise
					.then(function(response) {
						_.set(us, 'unitStatics', response);
						return response;
					})
				;
				return $q.all([
					bases,
					unitsStatics
				])
				.catch(function(err){
					console.log('line52', err);
				})
				.finally(function () {
					_.set(us, 'loaded', true);
				})
			}
		});
	}
	unitStaticService.$inject = ['$q', 'dynamic-dcs.api.unitStatics', 'dynamic-dcs.api.bases'];

	angular
		.module('dynamic-dcs.unitStaticService',['dynamic-dcs.api.unitStatics', 'dynamic-dcs.api.bases'])
		.service('unitStaticService', unitStaticService)
	;
})(angular);
