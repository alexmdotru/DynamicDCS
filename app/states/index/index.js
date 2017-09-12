(function (angular) {
	'use strict';

	function indexController (userAccountService, DCSUserAccountsAPI, socket, eventsAPI) {
		var indxCtrl = this;
		var curData = [
			[Date.UTC(2013,5,2),0.7695],
			[Date.UTC(2013,5,3),0.7648],
			[Date.UTC(2013,5,4),0.7645]
		];

		_.set(indxCtrl, 'hChart', {
			chartType: 'stock',
			rangeSelector: {
				selected: 0
			},

			title: {
				text: 'USD to EUR exchange rate'
			},

			tooltip: {
				style: {
					width: '200px'
				},
				valueDecimals: 4,
				shared: true
			},

			yAxis: {
				title: {
					text: 'Exchange rate'
				}
			},

			series: [{
				name: 'USD to EUR',
				data: curData,
				id: 'dataseries'

				// the event marker flags
			}, {
				type: 'flags',
				data: [{
					x: Date.UTC(2015, 5, 8),
					title: 'C',
					text: 'Stocks fall on Greece, rate concerns; US dollar dips'
				}, {
					x: Date.UTC(2015, 5, 12),
					title: 'D',
					text: 'Zimbabwe ditches \'worthless\' currency for the US dollar '
				}, {
					x: Date.UTC(2015, 5, 19),
					title: 'E',
					text: 'US Dollar Declines Over the Week on Rate Timeline'
				}, {
					x: Date.UTC(2015, 5, 26),
					title: 'F',
					text: 'Greek Negotiations Take Sharp Turn for Worse, US Dollar set to Rally '
				}, {
					x: Date.UTC(2015, 5, 29),
					title: 'G',
					text: 'Euro records stunning reversal against dollar'
				}, {
					x: Date.UTC(2015, 5, 30),
					title: 'H',
					text: 'Surging US dollar curbs global IT spend'
				}],
				onSeries: 'dataseries',
				shape: 'circlepin',
				width: 16
			}]
		});

		var dread = DCSUserAccountsAPI.query();
		dread.$promise
			.then(function (data) {
				_.set(userAccountService, 'userAccounts', data);
				_.set(userAccountService, 'localAccount', _.find(data, {authId: localStorage.getItem('sub')}));
				socket.emit('room', {
					server: 'leaderboard',
					authId: _.get(userAccountService, ['localAccount', 'authId'])
				});
			})
		;
		eventsAPI.getEvents();
		console.log('ev: ', eventsAPI);
	}
	indexController.$inject = ['userAccountService', 'dynamic-dcs.api.userAccounts', 'mySocket', 'eventService'];

	function configFunction($stateProvider) {
		$stateProvider
			.state('index', {
				controller: 'indexController',
				controllerAs: 'indxCtrl',
				templateUrl: '/apps/dynamic-dcs/states/index/index.tpl.html',
				url: '/'
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
