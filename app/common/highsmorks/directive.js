'use strict';

/**
 * @ngdoc directive
 * @name directive:highsmorks
 * @description
 * # Directive for highstocks.
 */
angular.module('highsmorks', []).directive('highsmorks', [
	'',
	function () {
		return {
			restrict: 'E',
			template: '<div class="highstock"><div class="chart"></div></div>',
			replace: true,
			scope: {
				chartConfig: '@',
				type: '@'
			},
			link: {
				pre: function(scope) {
					// Setup the chartConfig initially
					// There are other options for this in: scripts/libraries/highstocks.options.js
					// They could be overwritten here.
					scope.chartConfig = JSON.parse(scope.chartConfig);
				},
				post: function(scope, highchartDiv, attrs) {
					var highsmork=false;
					scope.chartConfig.chart = scope.chartConfig.chart || {};
					scope.chartConfig.chart.events = {
						load: function() {
							// 'this' is the chart object
							// I set it to highsmork, because I can't seem to
							// load the chart the other way with new Highchart
							// for some reason I can't figure out and no longer
							// care about it.
							highsmork = this;
						}
					};
					// StockChart requires you to pass with the type or not for the other kind.
					// This isn't backwards compatible, for some weird reason, no idea why.
					if (attrs.type==='StockChart') {
						$(highchartDiv).find('.chart').highcharts('StockChart', scope.chartConfig);
					} else {
						$(highchartDiv).find('.chart').highcharts(scope.chartConfig);
					}

					var seriesNameToIdx = function(name) {
						var idx = _.findIndex(highsmork.series, function(serie) {
							return serie.name === name;
						});
						return idx;
					};

					// highsmorks event handler
					scope.$on('highsmorks', function(event,smork) {
						if (!highsmork) {
							// If there is no chart here leave
							console.warn('There is no highsmork here.');
							return;
						}
						if ($(highsmork.container).parent().parent().attr('id') !== smork.id) {
							// The event gets broadcasted across all copies of this directive.
							// I'm returning, because I want to ignore smorks which are not this one.
							return;
						}
						switch (smork.method) {
							case 'addSeries':
								highsmork.addSeries(smork.obj);
								break;
							case 'addPoint':
								smork.seriesIdx = seriesNameToIdx(smork.seriesName);
								if(smork.seriesIdx === -1) {
									console.warn('Invalid series name.');
									return;
								}
								highsmork.series[smork.seriesIdx].addPoint(smork.obj);
								break;
							case 'redraw':
								highsmork.redraw();
								break;
							case 'setTitle':
								smork.obj.title    = smork.obj.title    ? {text:smork.obj.title}    : false;
								smork.obj.subtitle = smork.obj.subtitle ? {text:smork.obj.subtitle} : false;
								highsmork.setTitle(smork.obj.title,smork.obj.subtitle);
								break;
							default:
								console.warn('highsmorks missing or undefined method');
								break;
						}
					});
				}
			}
		};
	}
]);
