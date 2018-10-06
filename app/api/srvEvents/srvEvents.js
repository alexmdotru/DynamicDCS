(function (angular) {
	'use strict';

	function srvEventFactory($resource){
		var resourceUrl = '/api/srvEvents';
		return $resource(
			resourceUrl,
			{name: '@serverName'},
			{
				query: {
					method: 'GET',
					url: resourceUrl + '/:serverName',
					isArray: true
				}
			}
		);
	}
	srvEventFactory.$inject = ['$resource'];

	angular.module('ddcs.api.srvEvent', ['ngResource'])
		.factory('ddcs.api.srvEvent', srvEventFactory);
}(angular));
