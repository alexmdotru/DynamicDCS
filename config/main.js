module.exports = {
	//node server listening port
	port: 8080,

	//globals for sending system
	perSendMax: 500,
	outOfSyncUnitThreshold: 20,

	//setup dcsgame socket connection
	dcs_socket:	"192.168.44.61",
	clientPort:		3001,
	gameGuiPort:	3002,

	//test settings
	test_dcs_socket: '127.0.0.1',
	test_port: 8080,
	test_env: 'test'
};
