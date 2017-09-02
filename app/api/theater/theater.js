(function (angular) {
	'use strict';

	function theaterFactory($resource){
		var resourceUrl = '/api/theaters';
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
	theaterFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.theater', ['ngResource'])
	.factory('dynamic-dcs.api.theater', theaterFactory);
}(angular));
