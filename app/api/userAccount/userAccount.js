(function (angular) {
	'use strict';

	function serverFactory($resource){
		var resourceUrl = '/api';
		return $resource(
			resourceUrl,
			{_id: '@_id'},
			{
				query: {
					method: 'GET',
					url: resourceUrl + '/userAccounts',
					isArray:true
				},
				get: {
					method: 'GET',
					url: resourceUrl + '/userAccounts/:_id'
				},
				save: {
					method: 'POST',
					url: resourceUrl + '/protected/userAccounts'
				},
				update: {
					method: 'PUT',
					url: resourceUrl + '/protected/userAccounts/:_id'
				}
			}
		);
	}
	serverFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.server', ['ngResource'])
	.factory('dynamic-dcs.api.server', serverFactory);
}(angular));
