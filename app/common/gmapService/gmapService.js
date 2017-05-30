(function (angular) {
	'use strict';

	function controlService ($window, mySocket, $http) {
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
				window: {
					model: {},
					show: false
				},
				options: {
					mapTypeId: 'terrain',
					styles: gSrv.mapStyles()
				},
				markers: [],
				markersEvents: {
					click: function(marker, eventName, model) {
						gSrv.gmapObj.window.model = model;
						gSrv.gmapObj.window.show = true;
					}
				}
			});
		});

		_.set(gSrv, 'resetMarkers', function() {
			_.set(gSrv, 'gmapObj.markers', []);
			// console.log('reset markers');
		});

		//process inbound Unit Stream
		//console.log(_.get(gSrv, 'gmapObj.markers'));
		_.set(gSrv, 'processUnitStream', function (update) {
			if( _.get(update, 'action') == 'C' || _.get(update, 'action') == 'INIT') {
				var curMarker = {
					id: update.data.unitID,
					icon: {
						url: 'data:image/svg+xml;utf-8,'+gSrv.buildSIDC(update.data),
						anchor: new $window.google.maps.Point(15, 0)
					},
					type: update.data.type,
					playername: update.data.playername,
					coalition: update.data.coalition,
					latitude: update.data.lat,
					longitude: update.data.lon,
					zIndex: update.data.unitID
				};
				if(update.data.playername){
					_.set(curMarker, 'options', {
						labelContent: update.data.playername,
						labelAnchor: "10 -35",
						labelClass: "marker-labels"
					});
				}

				_.get(gSrv, 'gmapObj.markers').push(curMarker);
			}
			if( _.get(update, 'action') == 'U') {
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: update.data.unitID}), 'latitude', update.data.lat);
				_.set(_.find(_.get(gSrv, 'gmapObj.markers'),
					{id: update.data.unitID}), 'longitude', update.data.lon);
			}
			if( _.get(update, 'action') == 'D') {
				_.remove(_.get(gSrv, 'gmapObj.markers'), {id: update.data.unitID});
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
					//altitudeDepth: unit.playername,
					//direction: update.data.hdg,
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
	controlService.$inject = ['$window', 'mySocket', '$http'];

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
