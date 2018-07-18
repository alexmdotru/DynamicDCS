const _ = require('lodash');
const constants = require('../../constants');
const dbMapServiceController = require('../../db/dbMapService');
const DCSLuaCommands = require('../../player/DCSLuaCommands');
const sideLockController = require('../../action/sideLock');
const webPushCommands = require('../../socketIO/webPush');

_.set(exports, 'processPlayerEvent', function (serverName, sessionName, playerArray) {
	// webPushCommands.sendToAll(serverName, {payload: _.cloneDeep(playerArray)});
	_.set(exports, ['rtPlayerArray', serverName], playerArray.data);
	_.forEach(playerArray.data, function (player) {
		if (player !== null) {
			var curPlyrUcid = player.ucid;
			var curPlyrIPSplit =  _.split(player.ipaddr, '.');
			var curSearchIp = curPlyrIPSplit[0] + '.' + curPlyrIPSplit[1] + '.' +curPlyrIPSplit[2];
			var curPlyrSide = player.side;
			var curPlyrName = player.name;

			// dbMapServiceController.srvPlayerActions('read', serverName, {banned: true, $or: [{_id: curPlyrUcid}, {ipaddr: new RegExp('^' + curSearchIp)}] })
			dbMapServiceController.srvPlayerActions('read', serverName, {_id: curPlyrUcid, banned: true})
				.then(function (banUser) {
					if (!_.isEmpty(banUser)){
						console.log('Banning User: ', curPlyrName, curPlyrUcid, player.ipaddr);
						DCSLuaCommands.kickPlayer(
							serverName,
							player.id,
							'You have been banned from this server.'
						);
					} else {
						if (curPlyrName === '') {
							console.log('Banning User for blank name: ', curPlyrName, curPlyrUcid, player.ipaddr);
							DCSLuaCommands.kickPlayer(
								serverName,
								player.id,
								'You have been kicked from this server for having a blank name.'
							);
						}

						dbMapServiceController.unitActions('read', serverName, {playername: curPlyrName, dead: false})
							.then(function (unit) {
								var curUnit = _.get(unit, 0);
								var curUnitSide = _.get(curUnit, 'coalition');
								var curUnitUcid = _.get(curUnit, 'ucid');
								if(curUnit) {
									// switching to spectator gets around this, fix this in future please
									if ((curUnitSide !== curPlyrSide) && curPlyrSide !== 0 && curPlyrSide) {
										if (curUnitSide) {
											DCSLuaCommands.sendMesgToAll(
												serverName,
												curPlyrName + ' Has Switch To ' + constants.side[curPlyrSide],
												15
											);
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
                                        dbSystemLocalController.userAccountActions('read')
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
								} else {
									if(_.includes(player.slot, 'artillery_commander')) {
										dbMapServiceController.srvPlayerActions('read', serverName, {_id: player.ucid})
											.then(function (srvPlayer) {
												var curPlayer = _.first(srvPlayer);
												if (curPlayer.gciAllowed) {
                                                    if(curPlayer.sideLock === 0) {
                                                        dbMapServiceController.srvPlayerActions('update', serverName, {
                                                            _id: player.ucid,
                                                            sideLock: player.side,
                                                            sideLockTime: new Date().getTime() + (60 * 60 * 1000)
                                                        })
                                                            .then(function (srvPlayer) {
                                                                sideLockController.setSideLockFlags(serverName);
                                                                console.log(player.name + ' is now locked to ' + player.side);
                                                            })
                                                            .catch(function (err) {
                                                                console.log('line120', err);
                                                            })
                                                        ;
                                                    }
												} else {
                                                    DCSLuaCommands.kickPlayer(serverName, player.id, 'You are not allowed to use GCI/Tac Commander slot. Please contact a Mod for more information.');
												}
											})
											.catch(function (err) {
												console.log('line120', err);
											})
										;
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
			dbMapServiceController.srvPlayerActions('updateFromServer', serverName, curData)
				.catch(function (err) {
					console.log('line156', err);
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

