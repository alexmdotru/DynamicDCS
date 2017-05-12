(function (angular) {
	'use strict';

	function controlService ($rootScope) {
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
		});

		//process inbound Unit Init
		_.set(gSrv, 'processUnitInit', function (data) {
			_.set(gSrv, 'gmapObj.markers', []);
			_.forEach(_.get(data, 'units'), function(unit) {
				var curMarker = {
					id: unit.unitID,
					coords: {
						latitude: unit.lat,
						longitude: unit.lon
					}
				};
				_.get(gSrv, 'gmapObj.markers').push(curMarker);
			});
			$rootScope.$apply();
		});

		//process inbound Unit Stream
		_.set(gSrv, 'processUnitStream', function (data) {
			if( _.get(data, 'action') == 'C') {
				var curMarker = {
					id: data.unitID,
					coords: {
						latitude: data.lat,
						longitude: data.lon
					}
				};
				_.get(gSrv, 'gmapObj.markers').push(curMarker);
			}
			if( _.get(data, 'action') == 'U') {
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: data.unitID}), 'coords.latitude', data.lat);
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: data.unitID}), 'coords.longitude', data.lon);
			}
			if( _.get(data, 'action') == 'D') {
				_.remove(_.get(gSrv, 'gmapObj.markers'), {id: data.unitID});
			}
			$rootScope.$apply();
		});

	}
	controlService.$inject = ['$rootScope','mySocket'];

	function initializeGmapService (gmapService) {
		gmapService.init();
	}
	initializeGmapService.$inject = [
		'gmapService'
	];

	angular
		.module('dynamic-dcs.gmapService',[])
		.run(initializeGmapService)
		.service('gmapService', controlService)
	;
}(angular));
