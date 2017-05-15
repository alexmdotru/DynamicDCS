(function (angular) {
	'use strict';

	function controlService ($rootScope, $window, mySocket, $http) {
		var gSrv = this;
		_.set(gSrv, 'mySocket', mySocket);
		_.set(gSrv, 'init', function () {
			$http.get('json/sidc.json').then(function(sidJSON) {
				_.set(gSrv, 'SIDC', sidJSON.data);
			});

			//setup map style
			_.set(gSrv, 'mapStyles', function () {
				return [
					{
						"featureType": "administrative.neighborhood",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "poi",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "poi",
						"elementType": "labels.text",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "road",
						"elementType": "labels",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "transit.line",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "transit.station.bus",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "transit.station.rail",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					},
					{
						"featureType": "water",
						"elementType": "labels.text",
						"stylers": [
							{
								"visibility": "off"
							}
						]
					}
				];
			});

			_.set(gSrv, 'gmapObj', {
				center: {
					latitude: 43.4275113,
					longitude: 41.2920366
				},
				zoom: 8,
				options: {
					mapTypeId: 'terrain',
					styles: gSrv.mapStyles()
				},
				markers: [],
				events: {
					/*
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
					*/
				}
			});
		});

		//process inbound Unit Stream
		_.set(gSrv, 'processUnitStream', function (unit) {
			// console.log(_.get(unit, 'action'));
			if( _.get(unit, 'action') == 'C' || _.get(unit, 'action') == 'INIT') {
				var curMarker = {
					id: unit.unitID,
					icon: {
						url: 'data:image/svg+xml;utf-8,'+gSrv.buildSIDC(unit)
					},
					coords: {
						latitude: unit.lat,
						longitude: unit.lon
					},
					optimized: false
				};
				_.get(gSrv, 'gmapObj.markers').push(curMarker);
			}
			if( _.get(unit, 'action') == 'U') {
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: unit.unitID}), 'coords.latitude', unit.lat);
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: unit.unitID}), 'coords.longitude', unit.lon);
			}
			if( _.get(unit, 'action') == 'D') {
				_.remove(_.get(gSrv, 'gmapObj.markers'), {id: unit.unitID});
			}
			//$rootScope.$apply();
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
					//type: unit.type,
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
