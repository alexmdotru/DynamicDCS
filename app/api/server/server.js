(function (angular) {
	'use strict';

	function serverFactory($resource){
		var resourceUrl = '/api/servers';
		return $resource(
			resourceUrl,
			{name: '@name'},
			{
				query: {
					method: 'GET',
					url: resourceUrl,
					isArray:true
				},
				get: {
					method: 'GET',
					url: resourceUrl + '/:name'
				},
				delete: {
					method: 'DELETE',
					url: resourceUrl + '/:name'
				},
				save: {
					method: 'POST',
					url: resourceUrl
				},
				update: {
					method: 'PUT',
					url: resourceUrl + '/:name'
				}
			}
		);
	}
	serverFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.server', ['ngResource'])
	.factory('dynamic-dcs.api.server', serverFactory);
}(angular));
