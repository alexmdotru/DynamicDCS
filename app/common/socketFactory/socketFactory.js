(function (angular) {
	'use strict';

	function SocketFactoryController (io, socketFactory) {
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
			'angular-socket-io',
			'btford.socket-io'
		])
		.factory('mySocket', SocketFactoryController)
	;
}(angular));

