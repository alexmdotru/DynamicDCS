const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbMapServiceController = require('../db/dbMapService');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const webPushCommands = require('../socketIO/webPush');

const client = new Discord.Client();

client.on('ready', () => {
	console.log('Ready!');
	setInterval (function (){
		var discordUserNames = [];
		var curGuild = _.first(client.guilds.array());
		var userArray = curGuild.members.array();
		var onlineUsers = _.map(curGuild._rawVoiceStates.array(), 'user_id');
		_.forEach(onlineUsers, function (userId) {
			var curUser = _.find(userArray, {id: userId});
			discordUserNames.push((curUser.nickname) ? curUser.nickname : curUser.user.username);
		});
		console.log(discordUserNames);
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
