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
		var curGuild = _.first(client.guilds.array());
		var userArray = curGuild.members.array();
		var onlineUsers = _.map(curGuild._rawVoiceStates.array(), 'user_id');
		_.forEach(onlineUsers, function (userId) {
			var curUser = _.find(userArray, {id: userId});
			discordUserNames.push(_.toLower((curUser.nickname) ? curUser.nickname : curUser.user.username));
		});
		dbSystemServiceController.serverActions('read', {enabled: true})
			.then(function (srvs) {
				_.forEach(srvs, function (srv) {
					var curServerName = _.get(srv, '_id');
					dbMapServiceController.statSessionActions('readLatest', curServerName, {})
						.then(function (latestSession) {
							if (latestSession.name) {
								dbMapServiceController.srvPlayerActions('read', curServerName, {sessionName: latestSession.name, updatedAt: {$gt: new Date().getTime() - (exports.oldestAllowedUser * 1000)}})
									.then(function (playerArray) {
										console.log('dif: ', _.difference(_.map(playerArray, function (player) {return _.toLower(player.name); }), discordUserNames));
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
	}, 5000);
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
