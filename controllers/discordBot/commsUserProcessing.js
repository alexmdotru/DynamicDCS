const _ = require('lodash');
const dbSystemRemoteController = require('../db/dbSystemRemote');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');

var dBot = {};
var SRSServers = {
  DDCSStandard: 'srs.dynamicdcs.com:5002',
  DDCSHardcore: 'srs.dynamicdcs.com:5010'
};

exports.oldestAllowedUser = 300;
exports.timeToCorrect = 30;
exports.Only0ChannelNames = [
	'Please join side before joining GCI'
];
exports.Only1ChannelNames = [
	'Red Gen Chat(Relaxed GCI)',
	'Red GCI Group 1(Brevity)',
	'Red GCI Group 2(Brevity)'
];
exports.Only2ChannelNames = [
	'Blue Gen Chat(Relaxed GCI)',
	'Blue GCI Group 1(Brevity)',
	'Blue GCI Group 2(Brevity)'
];

_.set(dBot, 'processKick', function (serverName, curPlayer, playerCommObj, isDiscordAllowed, curPlayerUnit) {
	// console.log('PK: ', serverName, curPlayer, playerCommObj, isDiscordAllowed, curPlayerUnit);
    dbMapServiceController.srvPlayerActions('read', serverName, { _id: curPlayer.ucid })
        .then(function (curPlayerDB) {
            var curPlayerName = curPlayer.name;
            var curGicTimeLeft = _.get(curPlayerDB, '0.gicTimeLeft');
            var newLifeCount = (curGicTimeLeft === 0)? exports.timeToCorrect : curGicTimeLeft - 1 ;

            if (newLifeCount !== 0) {
                // console.log('GTBK: ', newLifeCount, curPlayerName);
                if (!playerCommObj) {
                    var mesg = "REQUIREMENT(" + newLifeCount + " mins left):You need to be in a VOICE discord channel(Status is online(not invisi)) OR connected to the SRS server (" + _.get(SRSServers, [serverName]) + "), You are not a member of the DDCS discord(with your name matching EXACTLY) https://discord.gg/3J3petx ";
                    console.log('GTBK: ', newLifeCount, curPlayerName, 'Not A Member');
                } else if (isDiscordAllowed) {
                    var mesg = "REQUIREMENT(" + newLifeCount + " mins left):You need to be in a VOICE discord channel(Status is online(not invisi)) OR connected to the SRS server (" + _.get(SRSServers, [serverName]) + "), https://discord.gg/3J3petx ";
                    console.log('GTBK: ', newLifeCount, curPlayerName, 'Not In Discord Or SRS');
                } else if (serverName !== _.get(playerCommObj, 'SRSData.SRSServer')) {
                    var mesg = "REQUIREMENT(" + newLifeCount + " mins left):You must join the correct SRS server (" + _.get(SRSServers, [serverName]) + ")";
                    console.log('GTBK: ', newLifeCount, curPlayerName, 'Not In the correct SRS');
                } else {
                    var mesg = "REQUIREMENT(" + newLifeCount + " mins left):You must join the SRS server (" + _.get(SRSServers, [serverName]) + ")";
                    console.log('GTBK: ', newLifeCount, curPlayerName, 'Not In SRS');
                }
                if (curPlayerUnit) {
                    DCSLuaCommands.sendMesgToGroup(curPlayerUnit.groupId, serverName, mesg, '60');
                }
                dbMapServiceController.srvPlayerActions('update', serverName, {_id: curPlayer.ucid, gicTimeLeft: newLifeCount})
                    .catch(function (err) {
                        console.log('line58', err);
                    })
                ;
            } else {
                if (!playerCommObj) {
                    var mesg = "KICKED: You need to be in a VOICE discord channel(Status is online(not invisi)) OR connected to the SRS server (" + _.get(SRSServers, [serverName]) + "), You are not a member of the DDCS discord(with your name matching EXACTLY) https://discord.gg/3J3petx ";
                    console.log('KICKING: ', curPlayerName, 'Not A Member');
                } else if (isDiscordAllowed) {
                    var mesg = "KICKED: You need to be in a VOICE discord channel(Status is online(not invisi)) OR connected to the SRS server (" + _.get(SRSServers, [serverName]) + "), https://discord.gg/3J3petx ";
                    console.log('KICKING: ', curPlayerName, 'Not In Discord OR SRS');
                } else if (serverName !== _.get(playerCommObj, 'SRSData.SRSServer')) {
                    var mesg = "KICKED: You must join the correct SRS server (" + _.get(SRSServers, [serverName]) + ")";
                    console.log('KICKING: ', curPlayerName, 'Not In the correct SRS');
                } else {
                    var mesg = "KICKED: You must join the SRS server (" + _.get(SRSServers, [serverName]) + ")";
                    console.log('KICKING: ', curPlayerName, 'Not In SRS');
                }
                dbMapServiceController.srvPlayerActions('update', serverName, {_id: curPlayer.ucid, gicTimeLeft: newLifeCount})
                    .then(function () {
                        if (curPlayerUnit) {
                            console.log('KICKED FOR NO COMMS: ', curPlayerUnit.playername, curPlayer.id);
                            DCSLuaCommands.sendMesgToGroup(curPlayerUnit.groupId, serverName, mesg, '60');
                        }
                        // DCSLuaCommands.forcePlayerSpectator(serverName, curPlayer.id, mesg);
                    })
                    .catch(function (err) {
                        console.log('line70', err);
                    })
                ;
            }
        })
        .catch(function (err) {
            console.log('line58', err);
        })
    ;
});

_.set(dBot, 'kickForNoComms', function (serverName, playerArray, isDiscordAllowed) {
    dbSystemRemoteController.remoteCommsActions('read', {})
        .then(function (playersInComms) {
			// console.log('pic: ', playersInComms);
            console.log('-------------------------------');
            _.forEach(playerArray, function (curPlayer) {
                var curPlayerName = curPlayer.name;
                var curPlayerCommObj = _.find(playersInComms, {_id: curPlayerName});
                dbMapServiceController.unitActions('read', serverName, {dead: false, playername: curPlayerName})
                    .then(function (pUnit) {
                        var curPlayerUnit = _.get(pUnit, '0');
                        if (curPlayerCommObj) {
                            // console.log( curPlayerName + ' is a member of DDCS community');
                            if (curPlayerUnit) {
                                // player is in unit
                                _.set(curPlayerCommObj, 'playerType', 'unit');
                            } else if (_.includes(curPlayer.slot, 'artillery_commander')) {
                                // player is in tac commander
                                _.set(curPlayerCommObj, 'playerType', 'jtac');
                            }  else if (_.includes(curPlayer.slot, '')) {
                                _.set(curPlayerCommObj, 'playerType', 'spectator');
                            }

                            if (!(curPlayerCommObj.isInSRS || (curPlayerCommObj.isInDiscord && isDiscordAllowed))) {
                                // console.log(curPlayerName + 'NOT in voice comms');
                                dBot.processKick(serverName, curPlayer,  curPlayerCommObj, isDiscordAllowed, curPlayerUnit);
                            }
                        } else {
                            // console.log( curPlayer.name + ' NOT a member of DDCS community');
                            dBot.processKick(serverName, curPlayer, curPlayerCommObj, isDiscordAllowed, curPlayerUnit);
                        }
                    })
                    .catch(function (err) {
                        console.log('line37', err);
                    })
                ;
            });
        })
        .catch(function (err) {
            console.log('line37', err);
        })
    ;
});

/*
_.set(dBot, 'kickForOpposingSides', function (playerArray, discordByChannel) {
	var moveToChan;
	_.forEach(exports.Only1ChannelNames, function (chanName) {
		if(discordByChannel[chanName]) {
			_.forEach(discordByChannel[chanName], function (vcUser, userName) {
				var findCurPlayer = _.find(playerArray, {name: userName});
				if(findCurPlayer) {
					if (findCurPlayer.side === 0) {
						console.log('kick user to gen: ', userName);
						moveToChan = client.channels.find("name", _.first(exports.Only0ChannelNames));
						vcUser.setVoiceChannel(moveToChan);
					} else if (findCurPlayer.side !== 1) {
						console.log('kick user for wrong side GCI: ', userName);
						moveToChan = client.channels.find("name", _.first(exports.Only2ChannelNames));
						vcUser.setVoiceChannel(moveToChan);
					}
				}
			});
		}
	});
	_.forEach(exports.Only2ChannelNames, function (chanName) {
		if(discordByChannel[chanName]) {
			_.forEach(discordByChannel[chanName], function (vcUser, userName) {
				var findCurPlayer = _.find(playerArray, {name: userName});
				if(findCurPlayer) {
					if (findCurPlayer.side === 0) {
						console.log('kick user to gen: ', userName);
						moveToChan = client.channels.find("name", _.first(exports.Only0ChannelNames));
						vcUser.setVoiceChannel(moveToChan);
					} else if (findCurPlayer.side !== 2) {
						console.log('kick user for wrong side GCI: ', userName);
						moveToChan = client.channels.find("name", _.first(exports.Only1ChannelNames));
						vcUser.setVoiceChannel(moveToChan);
					}
				}
			});
		}
	});
});
*/

_.set(exports, 'checkForComms', function (serverName, isDiscordAllowed, playerArray) {
    //console.log('PA: ', playerArray);
    var removeServerHost = _.filter(playerArray, function (p) {
        if (p) {
            return p.id != 1;
        }
        return false;
    });
    dBot.kickForNoComms(serverName, removeServerHost, isDiscordAllowed);
    /*
    var fiveMinsAgo = new Date().getTime() - (5 * oneMin);
    dbMapServiceController.statSessionActions('readLatest', serverName, {})
        .then(function (latestSession) {
            if (latestSession.name) {
                dbMapServiceController.srvPlayerActions('read', serverName, {
                    playerId: {$ne: '1'},
                    name: {$ne: ''},
                    sessionName: latestSession.name,
                    updatedAt: {
                        $gt: new Date(fiveMinsAgo)
                    }
                })
                    .then(function (playerArray) {
                        console.log('PA: ', playerArray.length, fiveMinsAgo, new Date().getTime(), new Date().getTime() - fiveMinsAgo, {
                            playerId: {$ne: '1'},
                            name: {$ne: ''},
                            sessionName: latestSession.name,
                            updatedAt: {
                                $gt: new Date(fiveMinsAgo)
                            }});
                    	dBot.kickForNoComms(serverName, playerArray, isDiscordAllowed);
                        // have all the existing player names on the server
                        // dBot.kickForOpposingSides(playerArray, discordByChannel); for the future
                    })
                    .catch(function (err) {
                        console.log('line181', err);
                    })
                ;
            }
        })
        .catch(function (err) {
            console.log('line187', err);
        })
    ;
    */
});
