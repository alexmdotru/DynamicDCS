const _ = require('lodash');
const Discord = require('discord.js');
const constants = require('../constants');
const dbSystemRemoteController = require('../db/dbSystemRemote');

const client = new Discord.Client();

var dBot = {};
var fs = require('fs');
var twoMin = 2 * 60 * 1000;

const SRSFilePaths = [
    // { name: 'DDCSStandard', path: 'C:/Users/andre/Desktop/testClient/2/clients-list.json' },
    // { name: 'DDCSHardcore', path: 'C:/Users/andre/Desktop/testClient/1/clients-list.json' },
	{ name: 'DDCSStandard', path: 'C:/Users/MegaServer/Desktop/SRS/DDCS-Standard/clients-list.json' },
	{ name: 'DDCSHardcore', path: 'C:/Users/MegaServer/Desktop/SRS/DDCS-Hardcore/clients-list.json' }
	];

fs.readFileAsync = function(fileObj) {
    return new Promise(function(resolve, reject) {
        fs.readFile(fileObj.path, function(err, data){
            if (err)
                reject(err);
            else
            	_.set(fileObj, 'data', JSON.parse(data));
                resolve(fileObj);
        });
    });
};

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
		var discordByChannel = {};
		var discordVoiceNames = ['Drexserver'];
		var SRSObjs = [];
		var voiceChans;
		var filePromise = [];

        _.forEach(SRSFilePaths, function (SRS) {
        	filePromise.push(fs.readFileAsync(SRS));
		});

        Promise.all(filePromise)
			.then( function(srsfiles) {
				_.forEach(srsfiles, function (srsfile) {
                    _.forEach(srsfile.data, function (curObj) {
                        _.set(curObj, 'SRSServer', srsfile.name);
                    	SRSObjs.push(curObj);
					});
				});
                voiceChans = curGuild.channels.filter(ch => ch.type === 'voice');
                _.forEach(Array.from(voiceChans.values()), function (voiceChan) {
                    _.forEach(Array.from(voiceChan.members.values()), function (vcUser) {
                        // console.log('nick: ', vcUser.nickname, 'un: ', _.get(vcUser, 'user.username'));
                        _.set(discordByChannel, [voiceChan.name, dBot.getName(vcUser)], vcUser);
                        discordVoiceNames.push(dBot.getName(vcUser));
                    });
                });



                curGuild.members.forEach(member => {
                	var curUser = {};
                    var curPlayerName = dBot.getName(member);
                    var SRSMember = _.find(SRSObjs, {Name: curPlayerName});
                    _.assign(curUser, {
                        _id: curPlayerName,
                        isInSRS: !!SRSMember,
                        isInDiscord: !!_.includes(discordVoiceNames, curPlayerName),
						SRSData: SRSMember
                    });
                 	dbSystemRemoteController.remoteCommsActions('update', curUser)
                    	.catch(function (err) {
                    		console.log('line63', err);
                		})
                	;
                });
			})
            .catch(function (err) {
                console.log('line52', err);
            })
        ;
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
