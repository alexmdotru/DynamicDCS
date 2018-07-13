const _ = require('lodash');
const dbSystemRemoteController = require('../db/dbSystemRemote');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

var dBot = {};
var oneMin = 60 * 1000;
var fiveMinsAgo = new Date(new Date()).getTime() - 5 * oneMin;

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


_.set(dBot, 'processKick', function (curServerName, curPlayer, playerCommObj, isDiscordAllowed) {
	var curPlayerName = curPlayer.name;
	var newLifeCount = (curPlayer.gicTimeLeft === 0)? exports.timeToCorrect : curPlayer.gicTimeLeft - 1 ;

	if (newLifeCount !== 0) {
		console.log('GTBK: ', newLifeCount, curPlayerName);
		if (isDiscordAllowed) {
            var mesg = "SERVER REQUIREMENT(you have " + newLifeCount + " mins left to fix):You are currently need to be in a VOICE discord channel(Status is online(not invisi)) OR SRS connected to the SRS server (srs.dynamicdcs.com), You also need to be a member of the DDCS discord(with your name matching EXACTLY) https://discord.gg/3J3petx";
         } else {
            var mesg = "SERVER REQUIREMENT(you have " + newLifeCount + " mins left to fix):You must the SRS server (SRS.dynamicdcs.com), You also need to be a member of the DDCS discord (with your nickname/name matching EXACTLY) https://discord.gg/3J3petx ";
         }
		 DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60');
        dbMapServiceController.srvPlayerActions('update', curServerName, {_id: curPlayer._id, gicTimeLeft: newLifeCount})
            .catch(function (err) {
                console.log('line58', err);
            })
        ;
	} else {
		console.log('KICKING: ', curPlayerName);
        if (isDiscordAllowed) {
            var mesg = "YOU HAVE BEEN KICKED TO SPECTATOR FOR NOT BEING IN COMMS, You are currently need to be in a VOICE discord channel(Status is online(not invisi)) OR SRS connected to the SRS server (srs.dynamicdcs.com), You also need to be a member of the DDCS discord(with your name matching EXACTLY) https://discord.gg/3J3petx";
        } else {
            var mesg = "YOU HAVE BEEN KICKED TO SPECTATOR FOR NOT BEING IN COMMS, You must the SRS server (SRS.dynamicdcs.com), You also need to be a member of the DDCS discord (with your nickname/name matching EXACTLY) https://discord.gg/3J3petx ";
        }
        dbMapServiceController.srvPlayerActions('update', curServerName, {_id: curPlayer._id, gicTimeLeft: newLifeCount})
            .then(function () {
                console.log('KICKED FOR NO COMMS: ', pUnit.playername);
                var mesg = "YOU HAVE BEEN KICKED TO SPECTATOR FOR NOT BEING IN COMMS, You are currently need to be in a VOICE discord channel, Status is online(not invisi) and/or your discord nickname and player name needs to match exactly. Please join DDCS discord https://discord.gg/3J3petx";
                DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60');
                DCSLuaCommands.forcePlayerSpectator(curServerName, curPlayer.playerId, mesg);
            })
            .catch(function (err) {
                console.log('line70', err);
            })
        ;
	}
});

_.set(dBot, 'kickForNoComms', function (curServerName, playerArray, isDiscordAllowed) {
    dbSystemRemoteController.remoteCommsActions('read', {})
        .then(function (playersInComms) {
            if (playersInComms.length > 0) {
                _.forEach(playerArray, function (curPlayer) {
                    var curPlayerName = curPlayer.name;
                    var playerType;
                    var curPlayerCommObj = _.find(playersInComms, {_id: curPlayerName});

                    if (curPlayerCommObj) {
                        // console.log( curPlayerName + ' is a member of DDCS community');
                        dbMapServiceController.unitActions('read', curServerName, {dead: false, playername: curPlayerName})
                            .then(function (pUnit) {
                                var curPlayerUnit = _.get(pUnit, '0');

                                if (curPlayerUnit) {
                                    // player is in unit
                                    _.set(curPlayerCommObj, 'playerType', 'unit');
                                } else if (_.includes(curPlayer.slot, 'artillery_commander')) {
                                    // player is in tac commander
                                    _.set(curPlayerCommObj, 'playerType', 'jtac');
                                }  else if (_.includes(curPlayer.slot, '')) {
                                    _.set(curPlayerCommObj, 'playerType', 'spectator');
                                }

                                if (curPlayerCommObj.isInSRS) {
                                    // console.log(curPlayerName + ' is in SRS');
                                } else if (curPlayerCommObj.isInDiscord && isDiscordAllowed) {
                                    // console.log(curPlayerName + ' is in discord voice');
                                } else {
                                    // console.log(curPlayerName + 'NOT in voice comms');
                                    dBot.processKick(curServerName, curPlayer, curPlayerCommObj, isDiscordAllowed);
                                }
                            })
                            .catch(function (err) {
                                console.log('line37', err);
                            })
                        ;
                    } else {
                        console.log( curPlayer.name + ' NOT a member of DDCS community');
                        dBot.processKick(curServerName, curPlayer, curPlayerCommObj, isDiscordAllowed);
                    }
                });
            }
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

_.set(exports, 'checkForComms', function (serverName, isDiscordAllowed) {
    dbMapServiceController.statSessionActions('readLatest', serverName, {})
        .then(function (latestSession) {
            if (latestSession.name) {
                dbMapServiceController.srvPlayerActions('read', serverName, {
                    playerId: {$ne: '1'},
                    name: {$ne: ''},
                    sessionName: latestSession.name,
                    updatedAt: {
                        $gt: fiveMinsAgo
                    }
                })
                    .then(function (playerArray) {
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
});
