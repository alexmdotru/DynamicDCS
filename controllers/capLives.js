const	_ = require('lodash');
const DCSLuaCommands = require('./DCSLuaCommands');
const groupController = require('./group');
const proximityController = require('./proximity');

_.set(exports, 'updateServerCapLives', function () {
	//update userNames out of cap lives, locked down specific plane types from those individuals (update lua table with individual names)
});

_.set(exports, 'resetLives', function () {
	// reset lives if current session != last session played
});

_.set(exports, 'removeLife', function () {
	// add cap life to player
});

_.set(exports, 'addLife', function () {
	// remove cap life to player or 0 lives
});
