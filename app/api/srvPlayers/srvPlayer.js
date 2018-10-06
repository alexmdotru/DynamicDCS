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

	angular.module('ddcs.api.srvPlayer', ['ngResource'])
		.factory('ddcs.api.srvPlayer', srvPlayerFactory);
}(angular));
