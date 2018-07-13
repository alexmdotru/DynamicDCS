const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemRemoteController = require('../db/dbSystemRemote');

const client = new Discord.Client();

var dBot = {};
var fs = require('fs');
var twoMin = 2 * 60 * 1000;

const SRSFilePath = 'C:/Program Files/DCS-SimpleRadio-Standalone/clients-list.json';

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
		var curGuild = client.guilds.get('389682718033707008');
		var curUser = {};
		var discordByChannel = {};
		var discordUserNames = ['Drexserver'];
		var SRSObj = {};
		var voiceChans;

        dbSystemRemoteController.remoteCommsActions('removeNonCommPeople', {})
            .catch(function (err) {
                console.log('line34', err);
            })
        ;

		// grab all discord members
        fs.readFile(SRSFilePath, 'utf8', function(err, data){
            if(err){ console.log('line 48: ', err) }
            SRSObj = JSON.parse(data);
            // grab all people in voice comms
            voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
            _.forEach(Array.from(voiceChans.values()), function (voiceChan) {
                _.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
                    // console.log('nick: ', vcUser.nickname, 'un: ', _.get(vcUser, 'user.username'));
                    _.set(discordByChannel, [voiceChan.name, dBot.getName(vcUser)], vcUser);
                    discordUserNames.push(dBot.getName(vcUser));
                });
            });

            curGuild.members.forEach(member => {
                var curPlayerName = dBot.getName(member);
                _.assign(curUser, {
                    _id: curPlayerName,
                    isInSRS: !!_.find(SRSObj, {Name: curPlayerName}),
                    isInDiscord: !!_.includes(discordUserNames, curPlayerName)
                });
                // console.log('upCur: ', curUser);
                if (curUser.isInSRS || curUser.isInDiscord) {
                    dbSystemRemoteController.remoteCommsActions('update', curUser)
                        .catch(function (err) {
                            console.log('line63', err);
                        })
                    ;
                }
            });
        });
	}, 60 * 1000);
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
