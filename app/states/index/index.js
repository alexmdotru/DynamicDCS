(function (angular) {
	'use strict';

	function indexController ($q, mySocket, eventService) {
		var indxCtrl = this;
		_.set(indxCtrl, 'eventService', eventService);
		_.set(indxCtrl, 'getChart', function () {
			return indxCtrl.chartConfig.getChartObj();
		});

		mySocket.emit('room', {
			server: 'DynamicCaucasus_leaderboard'
		});

		mySocket.on('srvUpd', function (data) {
			_.forEach(_.get(data, 'que'), function (event) {
				if (_.get(event, 'eventCode')) {
					var curChart = indxCtrl.getChart();
					var curScore = _.get(eventService, ['curScore', event.iucid, 'score'], 0) +
						_.get(event, 'score', 0);
					var curSeries = _.filter(data, function(obj) {
						return _.some(obj.userOptions, {id: _.get(event.iucid)});
					});
					_.set(curSeries, 'x', new Date().getTime());
					_.set(curSeries, 'y', curScore);
					_.set(curSeries, 'msg', _.get(event, 'msg'));
					_.set(curSeries, 'score', _.get(event, 'score', 0));
					curChart.addPoints({curSeries});
				}
			});

			// _.get(eCtrl, ['curScore', curPlayer, 'score'], 0) + _.get(event, 'score', 0);
		});

		_.set(eventService, 'events', {});
		_.set(indxCtrl, 'chartConfig', {
			chart:{
				type:'line',
				height: 400,
				events: {
					load: function () {
						/*
						var curChart;
						setInterval(function () {
							curChart = indxCtrl.chartConfig.getChartObj();
							var x = (new Date()).getTime(), // current time
								y = Math.round(Math.random() * 10000);
							console.log('cht: ', curChart, x, y);
							curChart.series[0].addPoint([x, y], true, true);
						}, 1000);
						/*
						// set up the updating of the chart each second
						var series = this.series[0];
						setInterval(function () {
							var x = (new Date()).getTime(), // current time
								y = Math.round(Math.random() * 100);
							series.addPoint([x, y], true, true);
						}, 1000);
						*/
					}
				}
			},
			chartType: 'stock',
			exporting: {
				enabled: false
			},
			tooltip: {
				headerFormat: '{point.x:%b %e, %k:%M:%S.%L UTC}',
				pointFormat: '<b>{point.msg}</b><br>{point.score} points | Score: {point.y}',
				split: true,
				crosshairs: true
			},
			plotOptions: {
				spline: {
					marker: {
						enabled: true
					}
				},
				enableMouseTracking: true
			},
			legend: {
				enabled: true,
				layout: 'vertical',
				align: 'left',
				verticalAlign: 'middle'
			},
			navigator: {
				enabled: true
			},
			rangeSelector: {
				selected: 5,
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
				},
				inputEnabled: false
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
			series: []
		});

		_.set(indxCtrl, 'getInitEvents', function () {
				var eventPromise = eventService.getInitEvents();
				eventPromise
					.then(function (data) {
						var curChart = indxCtrl.getChart();
						_.forEach(data, function (series) {
							curChart.addSeries(series);
						})
					})
					.catch(function (err) {
						console.log('init event err line147: ', err);
					})
				;
		});
		indxCtrl.getInitEvents();
	}
	indexController.$inject = ['$q', 'mySocket', 'eventService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'indxCtrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/',
				bindToController: true
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
			'highcharts-ng'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.run(authHandler)
		.controller('indexController', indexController)
	;
}(angular));
