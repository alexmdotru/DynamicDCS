

// "connect", playerID, name - no ucid lookup yet
DCSLuaCommands.sendMesgToAll(
	serverName,
	'A: '+_.get(queObj, 'data.arg2')+' has connected',
	5
);
