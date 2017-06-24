(function (angular) {
	'use strict';

	function SocketFactoryController (socketFactory) {
			var myIoSocket = io.connect('/', {
				query: 'token=Bearer '+localStorage.getItem('access_token')+'&authId='+localStorage.getItem('sub')
			});
			var mySocket = socketFactory({
				ioSocket: myIoSocket
			});
			return mySocket;
	}
	SocketFactoryController.$inject = [
		'socketFactory'
	];

	angular
		.module('dynamic-dcs.socketFactory', [
			'btford.socket-io'
		])
		.factory('mySocket', SocketFactoryController)
	;
}(angular));

