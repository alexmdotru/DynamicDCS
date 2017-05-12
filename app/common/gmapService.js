(function (angular) {
	'use strict';

	function controlService ($rootScope, $window, mySocket, $http) {
		var gSrv = this;
		_.set(gSrv, 'mySocket', mySocket);
		_.set(gSrv, 'init', function () {
			$http.get('json/sidc.json').then(function(sidJSON) {
				_.set(gSrv, 'SIDC', sidJSON.data);
			});
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
					icon: {
						url: 'data:image/svg+xml;utf-8,'+gSrv.buildSIDC(unit)
					},
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

		//process inbound Unit Stream
		_.set(gSrv, 'buildSIDC', function (unit) {

			var _sidcObject = {};
			_sidcObject["codingScheme"] = 'S';
			_sidcObject["affiliation"] = 'U';
			_sidcObject["battleDimension"] = 'G';
			_sidcObject["status"] = '-';
			_sidcObject["functionID"] = '-----';
			_sidcObject["modifier1"] = '-';
			_sidcObject["modifier2"] = '-';

			// make a SIDC Object to store all values, so that we can override these as needed
			var lookup = gSrv.SIDC[unit.type];
			// Check if this unit's type is defined in the table
			if (!lookup)
				return;
			var atr;
			for (atr in lookup) {
				if (lookup[atr])
					_sidcObject[atr] = lookup[atr];
			}

			var markerColor;
			if (unit.coalition == 1) {
				markerColor = 'rgb(255, 88, 88)';
				_sidcObject["affiliation"] = 'H';
			}
			if (unit.coalition == 2) {
				markerColor = 'rgb(128, 224, 255)';
				_sidcObject["affiliation"] = 'F';
			}

			// Generate final SIDC string
			var _sidc = "";
			for (atr in _sidcObject) {
				_sidc += _sidcObject[atr];
			}



			var symbol =  new $window.ms.Symbol(
				_sidc + '***',
				{
					size: 25,
					altitudeDepth: unit.playername,
					//direction: f.getProperties().hdg,
					//speed: Math.round(f.getProperties().speed) + ' kt',
					type: unit.type,
					//uniqueDesignation: 'TR' + f.getProperties().name,
					fill: markerColor,
					stroke: 'rgb(0, 0, 0)',
					infoColor: 'black'
				}).asSVG();
			return symbol;
		});

	}
	controlService.$inject = ['$rootScope', '$window', 'mySocket', '$http'];

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
