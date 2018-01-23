

// "self_kill", playerID
iCurObj = {sessionName: sessionName, name: queObj.data.name};
_.set(iCurObj, 'iPlayerId', _.get(queObj, 'data.arg1'));
iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
if (iPlayer) {
	iCurObj = {
		sessionName: sessionName,
		eventCode: abrLookup(_.get(queObj, 'action')),
		iucid: _.get(iPlayer, 'ucid'),
		iName: _.get(iPlayer, 'name'),
		displaySide: 'A',
		roleCode: 'I',
		msg: 'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has killed himself'
	};
	if(_.get(iCurObj, 'iucid')) {
		// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
		dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
	}

	DCSLuaCommands.sendMesgToAll(
		serverName,
		_.get(iCurObj, 'msg'),
		15
	);
}
