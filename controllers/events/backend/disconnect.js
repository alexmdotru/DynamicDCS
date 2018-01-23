

// "disconnect", playerID, name, playerSide, reason_code
iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
if (iPlayer) {
	iCurObj = {
		sessionName: sessionName,
		eventCode: abrLookup(_.get(queObj, 'action')),
		iucid: _.get(iPlayer, 'ucid'),
		iName: _.get(iPlayer, 'name'),
		displaySide: 'A',
		roleCode: 'I',
		msg: 'A: '+_.get(iPlayer, 'name')+' has disconnected - Ping:'+_.get(iPlayer, 'ping')+' Lang:'+_.get(iPlayer, 'lang')
	};
	if(_.get(iCurObj, 'iucid')) {
		// curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
		dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
	}
	DCSLuaCommands.sendMesgToAll(
		serverName,
		_.get(iCurObj, 'msg'),
		5
	);
}
