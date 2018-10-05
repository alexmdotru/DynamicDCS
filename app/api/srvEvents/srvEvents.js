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

	angular.module('dynamic-dcs.api.srvEvent', ['ngResource'])
		.factory('dynamic-dcs.api.srvEvent', srvEventFactory);
}(angular));
