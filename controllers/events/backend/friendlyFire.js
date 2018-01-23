

// "friendly_fire", playerID, weaponName, victimPlayerID
iCurObj = {
	sessionName: sessionName,
	eventCode: abrLookup(_.get(queObj, 'action')),
	displaySide: 'A',
	roleCode: 'I',
	showInChart: true
};
iPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg1});
if (iPlayer) {
	_.set(iCurObj, 'iucid', _.get(iPlayer, 'ucid'));
	_.set(iCurObj, 'iName', _.get(iPlayer, 'name'));
}
tPlayer = _.find(curServers[serverName].serverObject.players, {id: queObj.data.arg3});
if (tPlayer) {
	_.set(iCurObj, 'tucid', _.get(tPlayer, 'ucid'));
	_.set(iCurObj, 'tName', _.get(tPlayer, 'name'));
}
if(_.get(iCurObj, 'iucid') || _.get(iCurObj, 'tucid')) {
	curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
	dbMapServiceController.statSrvEventActions('save', serverName, iCurObj);
	DCSLuaCommands.sendMesgToAll(
		serverName,
		'A: '+getSide(_.get(iPlayer, 'side'))+' '+_.get(iPlayer, 'name')+' has accidentally killed '+_.get(tPlayer, 'name')+' with a '+_.get(queObj, 'data.arg2')+' - 100pts',
		15
	);
}
