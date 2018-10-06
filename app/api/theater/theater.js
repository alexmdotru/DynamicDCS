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

	angular.module('ddcs.api.theater', ['ngResource'])
		.factory('ddcs.api.theater', theaterFactory);
}(angular));
