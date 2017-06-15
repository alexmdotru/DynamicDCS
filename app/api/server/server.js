(function (angular) {
	'use strict';

	function serverFactory($resource){
		var resourceUrl = '/api';
		return $resource(
			resourceUrl,
			{name: '@name'},
			{
				query: {
					method: 'GET',
					url: resourceUrl + '/servers',
					isArray:true
				},
				get: {
					method: 'GET',
					url: resourceUrl + '/servers/:name'
				},
				delete: {
					method: 'DELETE',
					url: resourceUrl + '/protected/servers/:name'
				},
				save: {
					method: 'POST',
					url: resourceUrl + '/protected/servers'
				},
				update: {
					method: 'PUT',
					url: resourceUrl + '/protected/servers/:name'
				}
			}
		);
	}
	serverFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.server', ['ngResource'])
	.factory('dynamic-dcs.api.server', serverFactory);
}(angular));
