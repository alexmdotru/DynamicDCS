(function (angular) {
	'use strict';

	function userAccountFactory($resource){
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
				},
				checkUserAccount: {
					method: 'POST',
					url: resourceUrl + '/checkUserAccount'
				}
			}
		);
	}
	userAccountFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.userAccounts', ['ngResource'])
	.factory('dynamic-dcs.api.userAccounts', userAccountFactory);
}(angular));
