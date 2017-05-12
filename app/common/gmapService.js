(function (angular) {
	'use strict';

	function controlService ($rootScope, mySocket) {
		var gSrv = this;

		_.set(gSrv, 'init', function () {
			_.set(gSrv, 'gmapObj', {
				center: {
					latitude: 43.4275113,
					longitude: 41.2920366
				},
				zoom: 8,
				options: {
					mapTypeId: 'terrain'
				},
				markers: [],
				events: {
					click: function (map, eventName, originalEventArgs) {
						var e = originalEventArgs[0];
						var lat = e.latLng.lat(),
							lon = e.latLng.lng();
						var marker = {
							id: Date.now(),
							coords: {
								latitude: lat,
								longitude: lon
							}
						};
						gSrv.gmapObj.markers.push(marker);
						$rootScope.$apply();
					}
				}
			});
		})

	}
	controlService.$inject = ['$rootScope','mySocket'];

	function initializeGmapService (gmapService) {
		gmapService.init();
	}
	initializeGmapService.$inject = [
		'gmapService'
	];

	angular
		.module('dynamic-dcs.gmapService',[
			'dynamic-dcs.socketFactory'
		])
		.run(initializeGmapService)
		.service('gmapService', controlService)
	;
}(angular));
