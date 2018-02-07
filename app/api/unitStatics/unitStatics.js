(function (angular) {
	'use strict';

	function unitStaticsFactory($resource){
		var resourceUrl = '/api/unitStatics';
		return $resource(
			resourceUrl,
			{},
			{
				query: {
					method: 'GET',
					url: resourceUrl,
					isArray:true
				}
			}
		);
	}
	unitStaticsFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.unitStatics', ['ngResource'])
		.factory('dynamic-dcs.api.unitStatics', unitStaticsFactory);
}(angular));
