const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemServiceController = require('../db/dbSystemService');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

const client = new Discord.Client();

exports.oldestAllowedUser = 300;

client.on('ready', () => {
	console.log('Ready!');
	setInterval (function (){
		var discordUserNames = [];
		var curGuild = client.guilds.get('389682718033707008');
		var voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
		_.forEach(Array.from(voiceChans.values()), function (voiceChan) {
			_.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
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
								dbMapServiceController.srvPlayerActions('read', curServerName, {playerId: {$ne: '1'}, playername: {$ne: ''}, sessionName: latestSession.name})
									.then(function (playerArray) {
										var pNIC = _.reject(playerArray, function (player) {
											return _.includes(discordUserNames, player.name);
										});
										// console.log('pn: ', _.compact( _.map(pNIC, 'name')));
										dbMapServiceController.unitActions('read', curServerName, {playername: {$in: _.compact( _.map(pNIC, 'name'))}})
											.then(function (pUnits) {
												console.log('----------------------');
												_.forEach(pUnits, function (pUnit) {
													var mesg = "SERVER REQUIREMENT:You are currently not logged into a discord voice channel or your discord nickname and player name does not match(Case Sensitive!). Please join DDCS discord https://discord.gg/NSzajs7";
													console.log('GIComms:', pUnit.playername);
													DCSLuaCommands.sendMesgToGroup(pUnit.groupId, curServerName, mesg, '60')
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
