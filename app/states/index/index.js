(function (angular) {
	'use strict';

	function getEvents (eventService) {
		return eventService.getEvents();
	}
	getEvents.$inject=['eventService'];

	function indexController (mySocket, events) {
		var indxCtrl = this;
		var curData = [];
		var curScore = 0;
		var oneSec = 1000;
		var authId;

		console.log('ev: ', events);

		_.set(indxCtrl, 'events', events);

		mySocket.emit('room', {
			server: 'DynamicCaucasus_leaderboard'
		});

		mySocket.on('srvUpd', function (data) {
			console.log('LBEvent: ', data);
			events.byUcid(data);
		});

		mySocket.on('error', function (err) {
			console.log('Socket Reconnect: ', err);
		});

		mySocket.on('reconnect', function () {
			mySocket.emit('room', {
				server: 'DynamicCaucasus_leaderboard'
			});
		});

		_.set(indxCtrl, 'hChart', {
			chart: {
				height: 500
			},
			chartType: 'stock',
			legend: {
				enabled: true,
				layout: 'horizontal',
				verticalAlign: 'bottom',
				floating: true,
				y: -65
			},
			navigator: {
				margin: 50
			},
			rangeSelector: {
				selected: 3,
				buttons: [{
					type: 'minute',
					text: '1min'
				}, {
					type: 'minute',
					count: 15,
					text: '15min'
				}, {
					type: 'minute',
					count: 30,
					text: '30min'
				}, {
					type: 'hour',
					text: '1hr'
				}, {
					type: 'hour',
					count: 4,
					text: '4hr'
				}, {
					type: 'all',
					text: 'All'
				}],
				buttonTheme: {
					width: 60
				}
			},
			tooltip: {
				formatter: function() {
					var curToolTip = 'Time: '+ Highcharts.dateFormat('%k:%M:%S', this.x)+'<br>';
					_.forEach(_.get(this, 'points'), function (point) {
						var p = point.point;
						curToolTip += 'Score: '+p.y+'<br>';
						curToolTip += p.msg+'<br>';
					});
					return curToolTip;
				}
			},
			xAxis: {
				ordinal: false,
				title: {
					enabled: true,
					text: 'Zulu Military Time'
				},
				type: 'datetime',

				dateTimeLabelFormats : {
					hour: '%k',
					minute: '%k:%M',
					second: '%k:%M:%S',
					millisecond: '%k:%M:%S.%L',
				},
				labels: {
					style: {
						fontFamily: 'Tahoma'
					},
					rotation: -45
				}
			},
			yAxis: {
				title: {
					text: 'Points'
				},
				min: 0
			},
			series: indxCtrl.events.getEvents()
		});
	}
	indexController.$inject = ['mySocket', 'events'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'indxCtrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/',
				resolve: {
					events: getEvents
				}
			})
		;
	}

	function authHandler(authService) {
		authService.handleAuthentication();
	}
	authHandler.$inject = ['authService'];

	angular
		.module('state.index', [
			'ui.router',
			'dynamic-dcs.socketFactory',
			'uiGmapgoogle-maps',
			'dynamic-dcs.gmapService',
			'highcharts-ng'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(authHandler)
		.controller('indexController', indexController)
	;
}(angular));
