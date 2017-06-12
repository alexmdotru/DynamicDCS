(function (angular) {
	'use strict';

	function theaterFactory($resource){
		var resourceUrl = '/api/theaters';
		return $resource(
			resourceUrl,
			{name: '@name'},
			{
				get: {
					method: 'GET',
					url: resourceUrl + '/:name'
				}
			}
		);
	}
	theaterFactory.$inject = ['$resource'];

	angular.module('dynamic-dcs.api.theater', ['ngResource'])
	.factory('dynamic-dcs.api.theater', theaterFactory);
}(angular));
