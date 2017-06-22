(function (angular) {
	'use strict';

	function SocketFactory (socketFactory) {
		var mySocket = socketFactory();
		mySocket.on('connect', function () {});
		return mySocket;
	}
	SocketFactory.$inject = [
		'socketFactory'
	];

	angular
		.module('dynamic-dcs.socketFactory', [
			'btford.socket-io'
		])
		.factory('mySocket', SocketFactory)
	;
}(angular));

