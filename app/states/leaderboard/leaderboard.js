(function (angular) {
	'use strict';

	function leaderController (srvService, mySocket, eventService) {
		var leaderCtrl = this;
		_.set(leaderCtrl, 'srvService', srvService);
		_.set(leaderCtrl, 'eventService', eventService);
		_.set(leaderCtrl, 'selectedServer', 'DDCSStandard');
		_.set(leaderCtrl, 'getChart', function () {
			return leaderCtrl.chartConfig.getChartObj();
		});

		mySocket.emit('room', {
			server: 'Leaderboard'
		});

		mySocket.on('srvUpd', function (data) {
			_.forEach(_.get(data, 'que'), function (event) {
				if (_.get(event, 'eventCode')) {
					var curTime = new Date().getTime();
					var curEx;
					var newMin;
					var curObj = {};
					var newSeries = {};
					var curSeriesObj = leaderCtrl.curChart.get(_.get(event, 'iucid'));
					var curScore = _.get(eventService, ['curScore', event.iucid, 'score'], 0) +
						_.get(event, 'score', 0);

					if (curScore < 0) {
						curScore = 0;
					}
					var tScoreObj = {
						id: _.get(event, 'iucid'),
						name: _.get(event, 'iName'),
						score: curScore
					};
					eventService.setTopScore(tScoreObj);
					_.set(curObj, 'x', curTime);
					_.set(curObj, 'y', curScore);
					_.set(curObj, 'msg', _.get(event, 'msg'));
					_.set(curObj, 'score', curScore);
					if (curSeriesObj) {
						curSeriesObj.addPoint(curObj, false);
						curEx = curSeriesObj.xAxis.getExtremes();
						newMin = _.get(curEx, 'min') + (_.get(curObj, 'x') - _.get(curEx, 'max'));
						curSeriesObj.xAxis.setExtremes(newMin, _.get(curObj, 'x'), false);
					} else {
						//new user, add him as a series
						_.set(newSeries, ['id'], _.get(event, 'iucid'));
						_.set(newSeries, ['name'], _.get(event, 'iName'));
						_.set(newSeries, ['data'], [curObj]);
						_.set(newSeries, ['marker'], {
							enabled: true,
							radius: 3
						});
						_.set(newSeries, ['shadow'], false);
						_.set(newSeries, ['boostThreshold'], 500);
						leaderCtrl.curChart.addSeries(newSeries);
					}
					leaderCtrl.curChart.redraw();
				}
			});
		});

		_.set(leaderCtrl, 'getInitEvents', function () {
			var eventPromise = eventService.getInitEvents();
			eventPromise
				.then(function (data) {
					_.forEach(data, function (series) {
						leaderCtrl.curChart.addSeries(series);
					});
				})
				.catch(function (err) {
					/* eslint-disable no-console */
					console.log('init event err line147: ', err);
					/* eslint-enable no-console */
				})
			;
		});

		_.set(eventService, 'events', {});
		_.set(leaderCtrl, 'chartConfig', {
			chart:{
				type:'line',
				height: 400,
				events: {
					load: function () {
						_.set(leaderCtrl, 'curChart', this);
						leaderCtrl.curChart.showLoading();
						setTimeout(function () {
							leaderCtrl.getInitEvents();
							leaderCtrl.curChart.hideLoading();
						}, 1000);
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
				column: {
					animation: false
				}
			},
			legend: {
				enabled: true,
				layout: 'vertical',
				align: 'left',
				verticalAlign: 'middle'
			},
			navigator: {
				enabled: false
			},
			rangeSelector: {
				selected: 5,
				inputDateFormat: '%k:%M:%S',
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
					millisecond: '%k:%M:%S.%L'
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
	}
	leaderController.$inject = ['srvService', 'mySocket', 'eventService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('leaderboard', {
				controller: 'leaderboardController',
				controllerAs: 'leaderCtrl',
				templateUrl: '/apps/ddcs/states/leaderboard/leaderboard.tpl.html',
				url: '/Leaderboard',
				bindToController: true
			})
		;
	}

	angular
		.module('state.leaderboard', [
			'ui.router',
			'highcharts-ng'
		])
		.config(['$stateProvider', '$urlRouterProvider', configFunction])
		.controller('leaderboardController', leaderController)
	;
}(angular));
