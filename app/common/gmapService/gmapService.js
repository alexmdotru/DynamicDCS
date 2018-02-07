(function (angular) {
	'use strict';

	function controlService ($window, $http, userAccountService, uiGmapIsReady, uiGmapGoogleMapApi) {
		var gSrv = this;

		_.set(gSrv, 'init', function (theaterObj) {

			_.set(gSrv, 'gmapObj.markers', []);
			_.forEach(gSrv.baseOverlay, function (base) {
				base.setMap(null);
			});
			_.forEach(gSrv.circleOverlay, function (circle) {
				circle.setMap(null);
			});
			_.set(gSrv, 'baseOverlay', {});
			_.set(gSrv, 'circleOverlay', {});

			$http.get(_.get(theaterObj, 'overlayFile')).then(function(overlayCoordsJSON) {
				_.set(gSrv, 'overlayCoords', overlayCoordsJSON.data);
			});

			uiGmapIsReady.promise(1).then(function (maps) {
				gSrv.currentMap = maps[0].map;

				uiGmapGoogleMapApi.then(function (googleMaps) {
					_.set(gSrv, 'googleMaps', googleMaps);
					_.set(gSrv, 'gmapObj.options.mapTypeControlOptions.position',
						googleMaps.ControlPosition.LEFT_BOTTOM);

					gSrv.googleMaps.event.addListener(gSrv.currentMap, 'zoom_changed', function () {
						var zoomLevel = gSrv.currentMap.getZoom();
						if( zoomLevel > _.toNumber(_.get(theaterObj, 'removeSideZone'))){
							_.forOwn(gSrv.circleOverlay, function (value, key){
								gSrv.circleOverlay[key].setVisible(false);
							});
						}else{
							_.forOwn(gSrv.circleOverlay, function (value, key){
								gSrv.circleOverlay[key].setVisible(true);
							});
						}
					});

					_.set(gSrv, 'displayCoordinates', function (pnt) {
						var userUnit;
						var toHeading;
						var toDistance;
						_.set(userAccountService, 'localAccount.unit', _.find(gSrv.gmapObj.markers, {playername: userAccountService.localAccount.gameName}));
						_.set(userAccountService, 'localAccount.curPointer', {lat: pnt.lat(), lng: pnt.lng()});
						if (typeof userAccountService.localAccount.unit !== 'undefined') {
							userUnit = new gSrv.googleMaps.LatLng(
								userAccountService.localAccount.unit.latitude,
								userAccountService.localAccount.unit.longitude
							);
							toHeading = gSrv.googleMaps.geometry.spherical.computeHeading(userUnit, pnt);
							if (toHeading > 0) {
								toHeading = Math.round(toHeading);
							} else {
								toHeading = Math.round(360+toHeading);
							}
							_.set(userAccountService, 'localAccount.headingToPoint', toHeading);
							toDistance = (gSrv.googleMaps.geometry.spherical.computeDistanceBetween(userUnit, pnt) / 1000).toFixed(2);
							_.set(userAccountService, 'localAccount.headerInfo', 'Lat: '+pnt.lat().toFixed(6)+' Lng: '+pnt.lng().toFixed(6)+'<br>HdgToCursor: '+toHeading+'° DistToCursor: '+toDistance+'km');
						} else {
							_.set(userAccountService, 'localAccount.headerInfo', 'Lat: '+pnt.lat().toFixed(6)+' Lng: '+pnt.lng().toFixed(6));
						}
					});

					gSrv.googleMaps.event.addListener(gSrv.currentMap, 'rightclick', function (event) {
						gSrv.displayCoordinates(event.latLng);
					});

				});
			});

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

			console.log('reinit gmapObj');
			_.set(gSrv, 'gmapObj', {
				center: {
					latitude: _.toNumber(_.get(theaterObj, 'lat')),
					longitude: _.toNumber(_.get(theaterObj, 'lon'))
				},
				zoom: _.toNumber(_.get(theaterObj, 'zoom')),
				window: {
					model: {}
				},
				options: {
					mapTypeId: 'terrain',
					styles: gSrv.mapStyles()
				},
				markers: [],
				markersEvents: {
					click: function(marker, eventName, model) {
						gSrv.gmapObj.window = {
							coords: {
								latitude: model.latitude,
								longitude: model.longitude
							},
							options: {
								visible: true,
								pixelOffset: {height: -32, width: 0}
							},
							model: model,
							show: true
						};
					},
					rightclick:  function(marker, eventName, model) {
						var curLatLng = new gSrv.googleMaps.LatLng(model.latitude, model.longitude);
						gSrv.displayCoordinates(curLatLng);
					}
				}
			});
		});

		_.set(gSrv, 'resetMarkers', function() {
			_.set(gSrv, 'gmapObj.markers', []);
			_.set(userAccountService, 'localAccount.headerInfo', 'Right Click Map For Point Info');
		});


		_.set(gSrv, 'processAPICall', function (unitArray) {
			_.set(gSrv, 'gmapObj.markers', []);
			_.forEach(unitArray, function (unit) {
				gSrv.createMarker(unit);
			});
		});

		_.set(gSrv, 'createMarker', function (unit) {
			var curSymbol = gSrv.buildSIDC(unit);
			var curMarker = curSymbol;
			_.assign(curMarker, {
				id: unit._id,
				anchorPoint: curSymbol.getAnchor(),
				icon: curSymbol.asCanvas().toDataURL(),
				coords: unit.lonLatLoc,
				latitude: unit.lonLatLoc[1],
				longitude: unit.lonLatLoc[0],
				zIndex: unit.unitId
			});
			console.log('cm: ', curMarker);
			_.get(gSrv, 'gmapObj.markers').push(curMarker);
		});

		_.set(gSrv, 'updateMarker', function (unit) {
			var curSymbol = gSrv.buildSIDC(unit);
			console.log('csy: ', curSymbol);
			var curMarker = curSymbol;
			_.assign(curMarker, {
				id: unit._id,
				anchorPoint: curSymbol.getAnchor(),
				icon: curSymbol.asCanvas().toDataURL(),
				coords: unit.lonLatLoc,
				latitude: unit.lonLatLoc[1],
				longitude: unit.lonLatLoc[0],
				zIndex: unit.unitId
			});
			_.get(gSrv, 'gmapObj.markers').push(curMarker);
		});

		_.set(gSrv, 'delMarker', function (unit) {
			var curSymbol = gSrv.buildSIDC(unit);
			var curMarker = curSymbol;
			_.assign(curMarker, {
				id: unit._id,
				anchorPoint: curSymbol.getAnchor(),
				icon: curSymbol.asCanvas().toDataURL(),
				coords: unit.lonLatLoc,
				latitude: unit.lonLatLoc[1],
				longitude: unit.lonLatLoc[0],
				zIndex: unit.unitId
			});
			_.get(gSrv, 'gmapObj.markers').push(curMarker);
		});

		//process inbound Unit Stream
		_.set(gSrv, 'processUnitStream', function (update) {
			var curMarker;
			var curSymbol;
			if( _.get(update, 'action') === 'C' || _.get(update, 'action') === 'INIT') {

				curSymbol = gSrv.buildSIDC(update.data);
				curMarker = {
					id: update.data.unitID,
					anchorPoint: curSymbol.getAnchor(),
					icon: curSymbol.asCanvas().toDataURL(),
					type: update.data.type,
					playername: update.data.playername,
					coalition: update.data.coalition,
					coords: {
						latitude: update.data.lat,
						longitude: update.data.lon
					},
					latitude: update.data.lat,
					longitude: update.data.lon,
					alt: update.data.alt,
					hdg: update.data.hdg,
					speed: update.data.speed,
					zIndex: update.data.unitID,
				};

				/*
				if(update.data.playername){
					_.set(curMarker, 'options', {
						labelContent: update.data.playername,
						labelAnchor: "10 -35",
						labelClass: "marker-labels"
					});
				}
				*/
				_.get(gSrv, 'gmapObj.markers').push(curMarker);
			}
			if( _.get(update, 'action') == 'U') {
				curMarker = _.find(_.get(gSrv, 'gmapObj.markers'), {id: update.data.unitID});
				_.set(curMarker, 'latitude', update.data.lat);
				_.set(curMarker, 'longitude', update.data.lon);
				_.set(curMarker, 'alt', update.data.alt);
				_.set(curMarker, 'hdg', update.data.hdg);
				_.set(curMarker, 'speed', update.data.speed);
				if (typeof _.get(curMarker, 'type') !== 'undefined') {
					curSymbol = gSrv.buildSIDC(curMarker);
					_.set(curMarker, 'anchorPoint', curSymbol.getAnchor());
					_.set(curMarker, 'icon', curSymbol.asCanvas().toDataURL());
				}
			}
			if( _.get(update, 'action') == 'D') {
				_.remove(_.get(gSrv, 'gmapObj.markers'), {id: update.data.unitID});
			}
		});

		//process inbound Unit Stream
		_.set(gSrv, 'buildSIDC', function (unit) {
			console.log('U: ', unit);
			var _sidcObject = {};
			_sidcObject["codingScheme"] = 'S';
			_sidcObject["affiliation"] = 'U';
			_sidcObject["battleDimension"] = 'G';
			_sidcObject["status"] = '-';
			_sidcObject["functionID"] = '-----';
			_sidcObject["modifier1"] = '-';
			_sidcObject["modifier2"] = '-';
			_sidcObject["modifier3"] = '*';

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

			var ratio = window.devicePixelRatio || 1;
			var sidOpt = {
				size: 25 * ratio,
				//altitudeDepth: 'FL' + unit.alt,
				//type: unit.type,
				//uniqueDesignation: 'TR' + f.getProperties().name,
				fill: markerColor,
				stroke: 'rgb(0, 0, 0)',
				infoColor: 'black'
			};

			/*
			// makes the pictures flicker for some reason lol
			if (Math.round(unit.speed) > 0) {
				_.set(sidOpt, 'direction', unit.hdg);
				_.set(sidOpt, 'speed', Math.round(unit.speed) + ' kt');
			}
			*/
			if (unit.playername !== '') {
				_.set(sidOpt, 'type', unit.playername);
			}

			var symbol =  new $window.ms.Symbol( _sidc + '****', sidOpt );
			return symbol;
		});

		_.set(gSrv, 'addOverlay', function (base, side) {
			//console.log('addoverlay gmap: ',base,side);
			if ( typeof gSrv.overlayCoords[base] !== "undefined" &&
				typeof gSrv.googleMaps !== "undefined") {
				if ( typeof gSrv.overlayCoords[base].lat1 !== "undefined" ) {
					var imageBounds = new gSrv.googleMaps.LatLngBounds(
						new gSrv.googleMaps.LatLng(gSrv.overlayCoords[base].lat1,
							gSrv.overlayCoords[base].lng1),
						new gSrv.googleMaps.LatLng(gSrv.overlayCoords[base].lat2,
							gSrv.overlayCoords[base].lng2)
					);
					_.set(gSrv, ['baseOverlay', base],
						new gSrv.googleMaps.GroundOverlay('imgs/mapOverlays/' +
							base + '_' + side + '.png', imageBounds));
					_.get(gSrv, ['baseOverlay', base]).setMap(gSrv.currentMap);

					gSrv.googleMaps.event.addListener(_.get(gSrv, ['baseOverlay', base]), 'rightclick', function(e){
						gSrv.displayCoordinates(e.latLng);
					});
				}

				if ( typeof gSrv.overlayCoords[base].latc !== "undefined" ) {
					var center =  {lat: gSrv.overlayCoords[base].latc,
						lng: gSrv.overlayCoords[base].lngc};
					//setup 2 sides color
					var sideColor = {};
					sideColor[2] = '#00aaff';
					sideColor[1] = '#ff5555';

					_.set(gSrv, ['circleOverlay', base], new gSrv.googleMaps.Circle({
						strokeColor: sideColor[side],
						fillColor: sideColor[side],
						strokeOpacity: 0.2,
						strokeWeight: 0,
						map: gSrv.currentMap,
						center: center,
						radius: 30000
					}));

					gSrv.googleMaps.event.addListener(_.get(gSrv, ['circleOverlay', base]), 'rightclick', function(e){
						gSrv.displayCoordinates(e.latLng);
					});
				}
			}
		});

		_.set(gSrv, 'updateOverlay', function (base, side) {
			if(!_.includes(base, 'FARP')){ //until farps have a img overlay, bypass them...
				_.get(gSrv, ['baseOverlay', base]).setMap(null);
				delete gSrv.baseOverlay[base];
			}
			_.get(gSrv, ['circleOverlay', base]).setMap(null);
			delete gSrv.circleOverlay[base];

			gSrv.addOverlay(base, side);
		});
	}
	controlService.$inject = ['$window', '$http', 'userAccountService', 'uiGmapIsReady', 'uiGmapGoogleMapApi'];

	angular
		.module('dynamic-dcs.gmapService',[
			'uiGmapgoogle-maps'
		])
		//.run(initializeGmapService)
		.config(function(uiGmapGoogleMapApiProvider) {
			uiGmapGoogleMapApiProvider.configure({
				key: 'AIzaSyBtYlyyT5iCffhuFc07z8I-fTq6zuWkFjI',
				libraries: 'weather,geometry,visualization'
			});
		})
		.service('gmapService', controlService)
	;
}(angular));
