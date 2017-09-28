(function (angular) {
	'use strict';

	function indexController (srvService, mySocket, eventService) {
		var indxCtrl = this;
		_.set(indxCtrl, 'srvService', srvService);
		_.set(indxCtrl, 'eventService', eventService);
		_.set(indxCtrl, 'selectedServer', 'DynamicCaucasus');
		_.set(indxCtrl, 'getChart', function () {
			return indxCtrl.chartConfig.getChartObj();
		});

		mySocket.emit('room', {
			server: 'DynamicCaucasus_leaderboard'
		});

		mySocket.on('srvUpd', function (data) {
			_.forEach(_.get(data, 'que'), function (event) {
				if (_.get(event, 'eventCode')) {
					var curTime = new Date().getTime();
					var curEx;
					var newMin;
					var curObj = {};
					var newSeries = {};
					var curSeriesObj = indxCtrl.curChart.get(_.get(event, 'iucid'));
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
					_.set(curObj, 'score', _.get(event, 'score', 0));
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
						indxCtrl.curChart.addSeries(newSeries);
					}
					indxCtrl.curChart.redraw();
				}
			});
		});

		_.set(eventService, 'events', {});
		_.set(indxCtrl, 'chartConfig', {
			chart:{
				type:'line',
				height: 400,
				events: {
					render: function () {
						this.showLoading();
						setTimeout(function () {
							indxCtrl.getInitEvents();
							this.hideLoading();
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
				spline: {
					marker: {
						enabled: true
					}
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
						_.forEach(data, function (series) {
							indxCtrl.curChart.addSeries(series);
						});
					})
					.catch(function (err) {
						console.log('init event err line147: ', err);
					})
				;
		});
	}
	indexController.$inject = ['srvService', 'mySocket', 'eventService'];

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
