(function (angular) {
	'use strict';

	function basesFactory($resource){
		var resourceUrl = '/api/bases';
		return $resource(
			resourceUrl,
			{name: '@serverName'},
			{
				query: {
					method: 'GET',
					url: resourceUrl + '/:serverName',
					isArray:true
				}
			}
		);
	}
	basesFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.bases', ['ngResource'])
		.factory('dynamic-dcs.api.bases', basesFactory);
}(angular));
