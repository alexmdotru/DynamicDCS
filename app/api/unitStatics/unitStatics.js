(function (angular) {
	'use strict';

	function unitStaticsFactory($resource){
		var resourceUrl = '/api/unitStatics';
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
	unitStaticsFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.unitStatics', ['ngResource'])
		.factory('dynamic-dcs.api.unitStatics', unitStaticsFactory);
}(angular));
