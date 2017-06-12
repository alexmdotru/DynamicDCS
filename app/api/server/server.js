(function (angular) {
	'use strict';

	function serverFactory($resource){
		var resourceUrl = '/api/servers';
		return $resource(
			resourceUrl + '/:server_name',
			{server_name: '@server_name'},
			{}
		);
	}
	serverFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.server', ['ngResource'])
	.factory('dynamic-dcs.api.server', serverFactory);
}(angular));
