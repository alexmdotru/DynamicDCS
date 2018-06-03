const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemServiceController = require('../db/dbSystemService');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

const client = new Discord.Client();

var dBot = {};
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

_.set(dBot, 'kickForNoComms', function (curServerName, playerArray, discordUserNames) {
	var pNIC = _.reject(playerArray, function (player) {
		if (!_.includes(discordUserNames, player.name)) {
			// console.log('match: ', _.includes(discordUserNames, player.name), player.name, discordUserNames);
		}
		return _.includes(discordUserNames, player.name);
	});

	dbMapServiceController.unitActions('read', curServerName, {dead: false, playername: {$in: _.compact( _.map(pNIC, 'name'))}})
		.then(function (pUnits) {
			console.log('----------------------');
			_.forEach(pUnits, function (pUnit) {
				var curPlayer = _.find(playerArray, {name: pUnit.playername});
				if (curPlayer) {
					var newLifeCount = (curPlayer.gicTimeLeft === 0)? exports.timeToCorrect : curPlayer.gicTimeLeft - 1 ;
					if (newLifeCount !== 0) {
						console.log('GTBK: ', newLifeCount, pUnit.playername);
						var mesg = "SERVER REQUIREMENT(you have " + newLifeCount + " mins left to fix):You are currently need to be in a VOICE discord channel, Status is online(not invisi) and/or your discord nickname and player name needs to match exactly. Please join DDCS discord https://discord.gg/3J3petx";
                        DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60');
                        dbMapServiceController.srvPlayerActions('update', curServerName, {_id: curPlayer._id, gicTimeLeft: newLifeCount})
                            .catch(function (err) {
                                console.log('line58', err);
                            })
                        ;
					} else {
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
					}
				}
			})
		})
		.catch(function (err) {
			console.log('line37', err);
		})
	;
});

_.set(dBot, 'kickForOpposingSides', function (serverName, playerArray, discordByChannel) {
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
		var discordByChannel = {};
		var discordUserNames = ['Drexserver'];
		var curGuild = client.guilds.get('389682718033707008');
		var voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
		_.forEach(Array.from(voiceChans.values()), function (voiceChan) {
			_.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
				// console.log('nick: ', vcUser.nickname, 'un: ', _.get(vcUser, 'user.username'));
				_.set(discordByChannel, [voiceChan.name, dBot.getName(vcUser)], vcUser);
				discordUserNames.push(dBot.getName(vcUser));
			});
		});

		dbSystemServiceController.serverActions('read', {enabled: true})
			.then(function (srvs) {
				_.forEach(srvs, function (srv) {
					var curServerName = _.get(srv, '_id');
					dbMapServiceController.statSessionActions('readLatest', curServerName, {})
						.then(function (latestSession) {
							if (latestSession.name) {
								dbMapServiceController.srvPlayerActions('read', curServerName, {playerId: {$ne: '1'}, name: {$ne: ''}, sessionName: latestSession.name})
									.then(function (playerArray) {
										if(dBot.counter === 59) {
											dBot.kickForNoComms(curServerName, playerArray, discordUserNames);
											dBot.counter = 0;
										}
										// have all the existing player names on the server
										dBot.kickForOpposingSides(curServerName, playerArray, discordByChannel);
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
	if (message.content === '!playSound') {
		var channelsToPlay = [
			'Here But Coding',
			'Group 1',
			// 'Red Gen Chat(Relaxed GCI)',
			// 'Blue Gen Chat(Relaxed GCI)',
		];
		var vcArray = [];
		var songFile = 'C:/Users/andre/IdeaProjects/DynamicDCS/sndBites/AMERICAshort.mp3';
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
