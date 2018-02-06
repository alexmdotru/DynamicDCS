const _ = require('lodash');
const dbSystemServiceController = require('../../db/dbSystemService');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');

_.set(exports, 'processPlayerEvent', function (serverName, sessionName, playerArray) {
	_.set(exports, ['rtPlayerArray', serverName], playerArray);
	_.forEach(playerArray, function (player) {
		if (player !== null) {
			var curPlyrUcid = player.ucid;
			var curPlyrSide = player.side;
			var curPlyrName = player.name;
			console.log('PL: ', curPlyrUcid);
			dbSystemServiceController.banUserActions('read', curPlyrUcid)
				.then(function (banUser) {
					console.log('BU: ', banUser);
					if (!_.isEmpty(banUser)){
						console.log('Banning User: ', _.get(player, 'name'), curPlyrUcid);
						DCSLuaCommands.kickPlayer(
							serverName,
							player.id,
							'You have been banned from this server.'
						);
					} else {
						dbMapServiceController.unitActions('read', serverName, {playername: curPlyrName, dead: false})
							.then(function (unit) {
								var curUnit = _.get(unit, 0);
								var curUnitSide = _.get(curUnit, 'coalition');
								var curUnitUcid = _.get(curUnit, 'ucid');
								if(curUnit) {
									// switching to spectator gets around this, fix this in future please
									if ((curUnitSide !== curPlyrSide) && curPlyrSide !== 0 && curPlyrSide) {
										if (curUnitSide) {

											//fix refiring
											/*
                                            iCurObj = {
                                                sessionName: sessionName,
                                                eventCode: abrLookup(_.get(queObj, 'action')),
                                                iucid: curPlyrUcid,
                                                iName: curPlyrName,
                                                displaySide: 'A',
                                                roleCode: 'I',
                                                msg: 'A: '+getSide(curUnitSide)+' '+curPlyrName+' has commited Treason and switched to '+getSide(curPlyrSide)+'. Shoot on sight! -1000pts',
                                                score: -1000,
                                                showInChart: true
                                            };
                                            if(curPlyrUcid) {
                                                curServers[serverName].updateQue.leaderboard.push(_.cloneDeep(iCurObj));
                                                dbMapServiceController.simpleStatEventActions('save', serverName, iCurObj);
                                            }

                                            DCSLuaCommands.sendMesgToAll(
                                                serverName,
                                                _.get(iCurObj, 'msg'),
                                                15
                                            );
                                            */
										}
										/*
                                        dbSystemServiceController.userAccountActions('read')
                                            .then(function (resp) {
                                                var curSocket;
                                                var switchedPlayerSocket = _.get(nonaccountUsers, curPlyrUcid);
                                                var switchedPlayer = _.find(resp, {ucid: curPlyrUcid});
                                                if(switchedPlayerSocket) {
                                                    if (curPlyrSide === 1 || curPlyrSide === 2) {
                                                        setSocketRoom(switchedPlayerSocket, serverName + '_q' + curPlyrSide);
                                                        // sendInit(serverName, switchedPlayerSocket);
                                                    }
                                                } else if (switchedPlayer) {
                                                    curSocket = io.sockets.connected[_.get(switchedPlayer, 'curSocket')];
                                                    if (switchedPlayer.permLvl < 20) {
                                                        setSocketRoom(curSocket, serverName + '_padmin');
                                                    } else if (curPlyrSide === 1 || curPlyrSide === 2) {
                                                        setSocketRoom(curSocket, serverName + '_q' + curPlyrSide);
                                                        // sendInit(serverName, curSocket);
                                                    }
                                                }
                                            })
                                            .catch(function (err) {
                                                console.log('line626', err);
                                            })
                                        ;
                                        */
									}
								}
							})
							.catch(function (err) {
								console.log('err line596: ', err);
							})
						;
					}
				})
				.catch(function (err) {
					console.log('line886', err);
				})
			;
		}
	});

//need this for current player ID lookup
	//curServers[serverName].serverObject.players = queObj.data;
	var promisSrvPlayers = [];
	_.forEach(playerArray.data, function (data) {
		var curData = _.cloneDeep(data);
		if (_.get(curData, 'ucid')) {
			_.set(curData, '_id', curData.ucid);
			_.set(curData, 'playerId', curData.id);
			_.set(curData, 'sessionName', sessionName);
			// console.log('PA2: ', curData);
			//update map based player table
			dbMapServiceController.srvPlayerActions('update', serverName, curData)
				.catch(function (err) {
					console.log('line114', err);
				})
			;
		}
	});

//use update socket db table
//curServers[serverName].updateQue.q0.push(_.cloneDeep(queObj));
//curServers[serverName].updateQue.q1.push(_.cloneDeep(queObj));
//curServers[serverName].updateQue.q2.push(_.cloneDeep(queObj));
//curServers[serverName].updateQue.qadmin.push(_.cloneDeep(queObj));
});

