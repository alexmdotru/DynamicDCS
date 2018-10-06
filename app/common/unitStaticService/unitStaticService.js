(function (angular) {
	'use strict';

	function unitStaticService($q, unitStaticAPI, basesAPI) {
		var us = this;
		var bases;
		var unitsStatics;
		_.assign(us, {
			loaded: false,
			ckBasesLoad: function (serverName) {
				bases = basesAPI.query({serverName: serverName})
					.$promise
					.$then(function(response) {
						_.set(us, 'bases', response);
						return response;
					})
					.catch(function(err){
						/* eslint-disable no-console */
						console.log('line19', err);
						/* eslint-enable no-console */
					})
				;
			},
			ckUnitsStaticsLoad: function (serverName) {
				unitsStatics = unitStaticAPI.query({serverName: serverName})
					.$promise
					.$then(function(response) {
						_.set(us, 'unitStatics', response);
						return response;
					})
					.catch(function(err){
						/* eslint-disable no-console */
						console.log('line33', err);
						/* eslint-enable no-console */
					})
				;
			},
			init: function (serverName) {
				/* eslint-disable no-console */
				console.log('sn: ', serverName);
				/* eslint-enable no-console */
				bases = basesAPI.query({serverName: serverName})
					.$promise
					.then(function(response) {
						_.set(us, 'bases', response);
						return response;
					})
				;
				unitsStatics = unitStaticAPI.query({serverName: serverName})
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
						/* eslint-disable no-console */
						console.log('line62', err);
						/* eslint-enable no-console */
					})
					.finally(function () {
						_.set(us, 'loaded', true);
					})
				;
			}
		});
	}
	unitStaticService.$inject = ['$q', 'ddcs.api.unitStatics', 'ddcs.api.bases'];

	angular
		.module('ddcs.unitStaticService',['ddcs.api.unitStatics', 'ddcs.api.bases'])
		.service('unitStaticService', unitStaticService)
	;
})(angular);
