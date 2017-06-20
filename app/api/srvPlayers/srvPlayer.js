(function (angular) {
	'use strict';

	function srvPlayerFactory($resource){
		var resourceUrl = '/api/srvPlayers';
		return $resource(
			resourceUrl,
			{name: '@name'},
			{
				query: {
					method: 'GET',
					url: resourceUrl + '/:name',
					isArray: true
				}
			}
		);
	}
	srvPlayerFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.srvPlayer', ['ngResource'])
	.factory('dynamic-dcs.api.srvPlayer', srvPlayerFactory);
}(angular));
