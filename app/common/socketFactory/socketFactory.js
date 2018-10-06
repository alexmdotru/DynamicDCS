(function (angular) {
	'use strict';

	function SocketFactoryController (socketFactory) {
		var jart = this;
		console.log('sock: ', jart);
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
		.module('ddcs.socketFactory', [
			'btford.socket-io'
		])
		.factory('mySocket', SocketFactoryController)
	;
}(angular));

