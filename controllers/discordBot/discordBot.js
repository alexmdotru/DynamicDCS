const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemServiceController = require('../db/dbSystemService');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

const client = new Discord.Client();

exports.oldestAllowedUser = 300;
exports.timeToCorrect = 20;

client.on('ready', () => {
	console.log('Ready!');
	setInterval (function (){
		var discordUserNames = [];
		var curGuild = client.guilds.get('389682718033707008');
		var voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
		_.forEach(Array.from(voiceChans.values()), function (voiceChan) {
			_.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
				console.log('nick: ', vcUser.nickname, 'un: ', _.get(vcUser, 'user.username'));
				if (vcUser.nickname) {
					discordUserNames.push(vcUser.nickname);
				} else {
					discordUserNames.push(_.get(vcUser, 'user.username'));
				}
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
										var pNIC = _.reject(playerArray, function (player) {
											if (!_.includes(discordUserNames, player.name)) {
												// console.log('match: ', _.includes(discordUserNames, player.name), player.name, discordUserNames);
											}
											return _.includes(discordUserNames, player.name);
										});
										// console.log('pn: ', _.compact( _.map(pNIC, 'name')));
										dbMapServiceController.unitActions('read', curServerName, {playername: {$in: _.compact( _.map(pNIC, 'name'))}})
											.then(function (pUnits) {
												console.log('----------------------');
												_.forEach(pUnits, function (pUnit) {
													var curPlayer = _.find(playerArray, {name: pUnit.playername});
													if (curPlayer) {
														var newLifeCount = (curPlayer.gicTimeLeft === 0)? exports.timeToCorrect : curPlayer.gicTimeLeft - 1 ;
														if (newLifeCount !== 0) {
															console.log('GTBK: ', newLifeCount, pUnit.playername);
															var mesg = "SERVER REQUIREMENT(you have " + newLifeCount + " mins left to fix):You are currently not logged into a discord voice channel or your discord nickname and player name does not match(Case Sensitive!). Please join DDCS discord https://discord.gg/NSzajs7";
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
																	var mesg = "YOU HAVE BEEN KICKED TO SPECTATOR FOR NOT BEING IN COMMS, You are currently not logged into a discord voice channel or your discord nickname and player name does not match(Case Sensitive!). Please join DDCS discord https://discord.gg/NSzajs7";
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
	}, 60 * 1000);
});

client.on('message', message => {
	console.log(message.content);

	if (message.content === '!patreon') {
		message.channel.send('https://www.patreon.com/dynamicdcs');
	}
	if (message.content === '!paypal') {
		message.channel.send('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=HSRWLCYNXQB4N');
	}
});

client.login(constants.discordToken);
