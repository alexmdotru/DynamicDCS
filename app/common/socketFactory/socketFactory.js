(function (angular) {
	'use strict';

	function SocketFactoryController (socketFactory) {
		var qObj;
		var myIoSocket;
		if (localStorage.getItem('access_token')) {
			qObj = {
				query: 'token=Bearer ' + localStorage.getItem('access_token') + '&authId=' + localStorage.getItem('sub')
			};
		}
		myIoSocket = io.connect('/', qObj);
		return socketFactory({
			ioSocket: myIoSocket
		});
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

