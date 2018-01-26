const _ = require('lodash');
const jtacController = require('../action/jtac');

_.set(exports, 'processThirtySecActions', function (serverName, fullySynced) {
	if (fullySynced) {
		jtacController.aliveJtac30SecCheck(serverName);
	}
});
