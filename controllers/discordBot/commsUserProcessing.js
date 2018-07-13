const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemRemoteController = require('../db/dbSystemRemote');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

const client = new Discord.Client();

var dBot = {};
var fs = require('fs');
var oneMin = 60 * 1000;

exports.oldestAllowedUser = 300;
exports.timeToCorrect = 20;
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


_.set(dBot, 'processKick', function (curServerName, curPlayer, kickType) {
	var curPlayerName = curPlayer.name;
	var newLifeCount = (curPlayer.gicTimeLeft === 0)? exports.timeToCorrect : curPlayer.gicTimeLeft - 1 ;

	if (newLifeCount !== 0) {
		console.log('GTBK: ', newLifeCount, curPlayerName);
		/* var mesg = "SERVER REQUIREMENT(you have " + newLifeCount + " mins left to fix):You are currently need to be in a VOICE discord channel, Status is online(not invisi) and/or your discord nickname and player name needs to match exactly. Please join DDCS discord https://discord.gg/3J3petx";
        DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60');
        dbMapServiceController.srvPlayerActions('update', curServerName, {_id: curPlayer._id, gicTimeLeft: newLifeCount})
            .catch(function (err) {
                console.log('line58', err);
            })
        ;
        */
	} else {
		console.log('KICKING: ', curPlayerName);
		/*
        dbMapServiceController.srvPlayerActions('update', curServerName, {_id: curPlayer._id, gicTimeLeft: newLifeCount})
            .then(function () {
                console.log('KICKED FOR NO COMMS: ', pUnit.playername, pUnit);
                var mesg = "YOU HAVE BEEN KICKED TO SPECTATOR FOR NOT BEING IN COMMS, You are currently need to be in a VOICE discord channel, Status is online(not invisi) and/or your discord nickname and player name needs to match exactly. Please join DDCS discord https://discord.gg/3J3petx";
                DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60');
                DCSLuaCommands.forcePlayerSpectator(curServerName, curPlayer.playerId, mesg);
            })
            .catch(function (err) {
                console.log('line70', err);
            })
        ;
        */
	}
});

_.set(dBot, 'kickForNoComms', function (curSrv, playerArray, discordUserNames, allDDCSMembers) {
	var curServerName = _.get(curSrv, '_id');
	var SRSObj;
	fs.readFile(curSrv.SRSFilePath, 'utf8', function(err, data){
		if(err){ console.log('line 48: ', err) }
		SRSObj = JSON.parse(data);
		// console.log('srs log: ', SRSObj);
	});

	_.forEach(playerArray, function (curPlayer) {
		var curPlayerName = curPlayer.name;
		var playerType;
		if (_.includes(allDDCSMembers, curPlayerName)) {
			console.log( curPlayerName + ' is a member of DDCS community');
			dbMapServiceController.unitActions('read', curServerName, {dead: false, playername: curPlayerName})
				.then(function (pUnit) {
					var curPlayerUnit = _.get(pUnit, '0');

					if (curPlayerUnit) {
						// player is in unit
						playerType = 'unit';
					} else if (_.includes(curPlayer.slot, 'artillery_commander')) {
						// player is in tac commander
						playerType = 'jtac';
					}  else if (_.includes(curPlayer.slot, '')) {
						playerType = 'spectator';
					}

					if (playerType) {
						//check SRS
						if (_.find(SRSObj, {Name: curPlayerName})) {
							console.log(curPlayerName + ' is in SRS');
						} else if (_.includes(discordUserNames, curPlayerName) && curSrv.isDiscordAllowed) {
							console.log(curPlayerName + ' is in discord voice');
						} else {
							console.log(curPlayerName + 'NOT in voice comms');
							dBot.processKick(curServerName, curPlayer, 'notInComms');
						}
					}
				})
				.catch(function (err) {
					console.log('line37', err);
				})
			;
		} else {
			console.log( curPlayer.name + ' NOT a member of DDCS community');
			dBot.processKick(curServerName, curPlayer, 'notAMember');
		}
	});
});

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


_.set(dBot, 'getName', function (vcUser) {
	if (vcUser.nickname) {
		return vcUser.nickname;
	}
	return _.get(vcUser, 'user.username');
});

client.on('ready', () => {
	console.log('Ready!');
	dBot.counter = 0;
	setInterval (function (){
		var allDDCSMembers = [];
		var curGuild = client.guilds.get('389682718033707008');
		var discordByChannel = {};
		var discordUserNames = ['Drexserver'];
		var voiceChans;

		// grab all people in voice comms
		voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
		_.forEach(Array.from(voiceChans.values()), function (voiceChan) {
			_.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
				// console.log('nick: ', vcUser.nickname, 'un: ', _.get(vcUser, 'user.username'));
				_.set(discordByChannel, [voiceChan.name, dBot.getName(vcUser)], vcUser);
				discordUserNames.push(dBot.getName(vcUser));
			});
		});

		// grab all discord members
		curGuild.members.forEach(member => {
			allDDCSMembers.push(dBot.getName(member));
			// console.log('MM: ', member.nickname, member.user.username, dBot.getName(member));
		});

		dbSystemServiceController.serverActions('read', {enabled: true})
			.then(function (srvs) {
				var fiveMinsAgo = new Date(new Date()).getTime() - oneMin;
				_.forEach(srvs, function (srv) {
					var curServerName = _.get(srv, '_id');
					dbMapServiceController.statSessionActions('readLatest', curServerName, {})
						.then(function (latestSession) {
							if (latestSession.name) {
								dbMapServiceController.srvPlayerActions('read', curServerName, {
									playerId: {$ne: '1'},
									name: {$ne: ''},
									sessionName: latestSession.name,
									updatedAt: {
										$gt: fiveMinsAgo
									}
								})
									.then(function (playerArray) {
										if(dBot.counter === 5) {
											dBot.kickForNoComms(srv, playerArray, discordUserNames, allDDCSMembers);
											dBot.counter = 0;
										}
										// have all the existing player names on the server
										dBot.kickForOpposingSides(playerArray, discordByChannel);
										dBot.counter++;
									})
									.catch(function (err) {
										console.log('line37', err);
									})
								;
							}
						})
						.catch(function (err) {
							console.log('line43', err);
						})
					;
				})
			})
			.catch(function (err) {
				console.log('line49', err);
			})
		;
	}, 1 * 1000);
});

_.set(exports, 'sendSoundBite', function (vcArray, songFile) {
	vcArray[0].join().then(function (connection) {
		const dispatcher = connection.playFile(songFile);
		dispatcher.on("end", function (end) {
			vcArray[0].leave();
			if (vcArray.length !== 1) {
				vcArray.shift();
				exports.sendSoundBite(vcArray, songFile);
			}
		});
	}).catch(err => console.log(err));
});


client.on('message', message => {
	console.log(message.content);

	if (message.content === '!patreon') {
		message.channel.send('https://www.patreon.com/dynamicdcs');
	}
	if (message.content === '!paypal') {
		message.channel.send('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=HSRWLCYNXQB4N');
	}
	if (message.content === '!America') {
		var channelsToPlay = [
			'General',
			// 'Red Gen Chat(Relaxed GCI)',
			// 'Blue Gen Chat(Relaxed GCI)',
		];
		var vcArray = [];
		var songFile = 'C:/Users/MegaServer/DynamicDCS/sndBites/AMERICAshort.mp3';
		var curGuild = client.guilds.get('389682718033707008');

		_.forEach(channelsToPlay, function (channel) {
			vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === channel).array()));
		});

		//vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === 'Here But Coding').array()));
		//vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === 'Group 1').array()));
		// vcArray = curGuild.channels.filter(ch => ch.type === 'voice').array();

		exports.sendSoundBite(vcArray, songFile);

		message.channel.send('testPlay');
	}
	if (message.content === '!F-18') {
		var channelsToPlay = [
			'General',
			// 'Red Gen Chat(Relaxed GCI)',
			// 'Blue Gen Chat(Relaxed GCI)',
		];
		var vcArray = [];
		var songFile = 'C:/Users/MegaServer/DynamicDCS/sndBites/DCS_World_FA-18C_Hornet_Menu_Theme.mp3';
		var curGuild = client.guilds.get('389682718033707008');

		_.forEach(channelsToPlay, function (channel) {
			vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === channel).array()));
		});

		//vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === 'Here But Coding').array()));
		//vcArray.push(_.first(curGuild.channels.filter(ch => ch.type === 'voice' && ch.name === 'Group 1').array()));
		// vcArray = curGuild.channels.filter(ch => ch.type === 'voice').array();

		exports.sendSoundBite(vcArray, songFile);

		message.channel.send('testPlay');
	}
});

client.login(constants.discordToken);
