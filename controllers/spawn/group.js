const _ = require('lodash');
const constants = require('../constants');
const dbMapServiceController = require('../db/dbMapService');
const dbSystemLocalController = require('../db/dbSystemLocal');
const DCSLuaCommands = require('../player/DCSLuaCommands');
const zoneController = require('../proxZone/zone');

_.set(exports, 'spawnGrp', function (grpSpawn, country, category) {
	return gSpawnCmd = 'coalition.addGroup(' + _.indexOf(constants.countryId, country) + ', Group.Category.' + category + ', ' + grpSpawn + ')';
});

_.set(exports, 'spawnStatic', function (serverName, staticSpawn, country, statName, init) {

	return sSpawnCmd = [
		'coalition.addStaticObject(' + _.indexOf(constants.countryId, country) + ', ' + staticSpawn + ')'
	];

	/*
	if (init) {
		return sSpawnCmd = [
			'coalition.addStaticObject(' + _.indexOf(constants.countryId, country) + ', ' + staticSpawn + ')'
		];
	} else {
		exports.destroyUnit( serverName, statName );
		return sSpawnCmd = [
			'coalition.addStaticObject(' + _.indexOf(constants.countryId, country) + ', ' + staticSpawn + ')'
		];
	}
	*/
});

_.set(exports, 'turnOnEWRAuto', function () {
	return '' +
		'["route"] = {' +
			'["spans"] = {},' +
			'["points"] = {' +
				'[1] = {' +
					// '["alt"] = 252,' +
					'["type"] = "Turning Point",' +
					'["ETA"] = 0,' +
					'["alt_type"] = "BARO",' +
					'["formation_template"] = "",' +
					// '["y"] = 440640.41085714,' +
					// '["x"] = -60694.918271202,' +
					'["name"] = "dontdisperse",' +
					'["ETA_locked"] = true,' +
					'["speed"] = 0,' +
					'["action"] = "Off Road",' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["enabled"] = true,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["number"] = 1,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["name"] = 8,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["name"] = "ewr enroute task",' +
									'["id"] = "EWR",' +
									'["auto"] = true,' +
									'["enabled"] = true,' +
									'["params"] = {},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},';
});

_.set(exports, 'turnOffDisperseUnderFire', function () {
	return '' +
		'["route"] = {' +
			'["spans"] = {},' +
			'["points"] = {' +
				'[1] = {' +
					// '["alt"] = 252,' +
					'["type"] = "Turning Point",' +
					'["ETA"] = 0,' +
					'["alt_type"] = "BARO",' +
					'["formation_template"] = "",' +
					// '["y"] = 440640.41085714,' +
					// '["x"] = -60694.918271202,' +
					'["name"] = "dontdisperse",' +
					'["ETA_locked"] = true,' +
					'["speed"] = 0,' +
					'["action"] = "Off Road",' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["enabled"] = true,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["number"] = 1,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["name"] = 8,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},';
});

_.set(exports, 'defenseHeliRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = true,' +
									'["id"] = "EngageTargets",' +
									'["enabled"] = true,' +
									'["key"] = "CAS",' +
									'["params"] = {' +
										'["targetTypes"] = {' +
											'[1] = "Helicopters",' +
											'[2] = "Ground Units",' +
											'[3] = "Light armed ships",' +
										'},' +
										'["priority"] = 0,' +
									'},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=2,' +
												'["name"]=1,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[3] = {' +
									'["number"] = 3,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=0,' +
												'["name"]=0,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[3]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 2, 1]) + ', ' + _.get(routes, ['routeLocs', 2, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 2, 1]) + ', ' + _.get(routes, ['routeLocs', 2, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[4]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 3, 1]) + ', ' + _.get(routes, ['routeLocs', 3, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 3, 1]) + ', ' + _.get(routes, ['routeLocs', 3, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[5]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 4, 1]) + ', ' + _.get(routes, ['routeLocs', 4, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 4, 1]) + ', ' + _.get(routes, ['routeLocs', 4, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[6]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 5, 1]) + ', ' + _.get(routes, ['routeLocs', 5, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 5, 1]) + ', ' + _.get(routes, ['routeLocs', 5, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[7]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {["tasks"] = {}}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 6, 1]) + ', ' + _.get(routes, ['routeLocs', 6, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 6, 1]) + ', ' + _.get(routes, ['routeLocs', 6, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[8]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "SwitchWaypoint",' +
											'["params"] = {' +
												'["goToWaypointIndex"] = 1,' +
												'["fromWaypointIndex"] = 8,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'}' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 7, 1]) + ', ' + _.get(routes, ['routeLocs', 7, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 7, 1]) + ', ' + _.get(routes, ['routeLocs', 7, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
	;
});

_.set(exports, 'atkHeliRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = true,' +
									'["id"] = "EngageTargets",' +
									'["enabled"] = true,' +
									'["key"] = "CAS",' +
									'["params"] = {' +
										'["targetTypes"] = {' +
											'[1] = "Helicopters",' +
											'[2] = "Ground Units",' +
											'[3] = "Light armed ships",' +
										'},' +
										'["priority"] = 0,' +
									'},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=2,' +
												'["name"]=1,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[3] = {' +
									'["number"] = 3,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=0,' +
												'["name"]=0,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
		;
});

_.set(exports, 'bombersPlaneRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=true,' +
												'["name"]=15,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=2,' +
												'["name"]=1,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[3] = {' +
									'["number"] = 3,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=4,' +
												'["name"]=0,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = false,' +
									'["id"] = "EngageTargets",' +
									'["enabled"] = true,' +
									'["key"] = "CAS",' +
									'["params"] = {' +
										'["targetTypes"] = {' +
											'[1] = "Helicopters",' +
											'[2] = "Ground Units",' +
											'[3] = "Light armed ships",' +
										'},' +
										'["priority"] = 0,' +
									'},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"]=0,' +
												'["name"]=0,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
	;
});

_.set(exports, 'awacsPlaneRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = true,' +
									'["id"] = "AWACS",' +
									'["enabled"] = true,' +
									'["params"]={},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["name"] = "RadioFreq",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "SetFrequency",' +
											'["params"] = {' +
												'["power"]=10,' +
												'["modulation"]=0,' +
												'["frequency"]=' + _.get(routes, 'radioFreq') + ',' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[3] = {' +
									'["number"] = 3,' +
									'["auto"] = false,' +
									'["id"] = "Orbit",' +
									'["enabled"]=true,' +
									'["params"] = {' +
										'["altitude"] = ' + _.get(routes, 'alt') + ',' +
										'["pattern"] = "Race-Track",' +
										'["speed"] = ' + _.get(routes, 'speed') + ',' +
										'["speedEdited"] = true,' +
									'},' +
								'},' +
								'[4] = {' +
									'["number"] = 4,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["name"] = 1,' +
												'["value"] = 2,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"]={}' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
	;
});

_.set(exports, 'tankerPlaneRouteTemplate', function (routes) {
	var tankerTemplate = '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = true,' +
									'["id"] = "Tanker",' +
									'["enabled"]=true,' +
									'["params"]={},' +
								'},' +
								'[2] = {' +
									'["number"] = 2,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["name"] = "RadioFreq",' +
									'["enabled"]=true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "SetFrequency",' +
											'["params"] = {' +
												'["power"]=10,' +
												'["modulation"]=0,' +
												'["frequency"]=' + _.get(routes, 'radioFreq') + ',' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[3] = {' +
									'["number"] = 3,' +
									'["auto"] = false,' +
									'["id"] = "Orbit",' +
									'["enabled"]=true,' +
									'["params"] = {' +
										'["altitude"] = ' + _.get(routes, 'alt') + ',' +
										'["pattern"] = "Race-Track",' +
										'["speed"] = ' + _.get(routes, 'speed') + ',' +
										'["speedEdited"] = true,' +
									'},' +
								'},' +
								'#TACAN' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = ' + _.get(routes, 'alt') + ',' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = ' + _.get(routes, 'speed') + ',' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"]={}' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
		;
	var tacanInfo = '[4] = {' +
		'["number"] = 4,' +
		'["auto"] = true,' +
		'["id"] = "WrappedAction",' +
		'["name"] = "TACAN",' +
		'["enabled"] = true,' +
		'["params"] = {' +
			'["action"] = {' +
				'["id"] = "ActivateBeacon",' +
				'["params"] = {' +
					'["type"] = 4,' +
					'["AA"] = true,' +
					'["callsign"] = "BHABTKR",' +
					'["system"] = 4,' +
					'["name"] = "BHABTKR",' +
					'["channel"] = ' + _.get(routes, 'tacan.channel') + ',' +
					'["modeChannel"] = "' + _.get(routes, 'tacan.modeChannel') + '",' +
					'["bearing"] = true,' +
					'["frequency"]= ' + _.get(routes, 'tacan.frequency') + ',' +
				'},' +
			'},' +
		'},' +
	'},'
	;

	if(_.get(routes, 'tacan.enabled')) {
		tankerTemplate = _.replace(tankerTemplate, "#TACAN", tacanInfo);
	} else {
		tankerTemplate = _.replace(tankerTemplate, "#TACAN", "");
	}
	return tankerTemplate;
});

_.set(exports, 'landPlaneRouteTemplate', function (routes) {
	return '' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = 2000,' +
					'["action"] = "Turning Point",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = 138,' +
					'["task"] = {' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"] = {' +
								'[1] = {' +
									'["enabled"]=true,' +
									'["auto"]=false,' +
									'["id"]="WrappedAction",' +
									'["number"] = 1,' +
									'["params"]={' +
										'["action"]={' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					//'["ETA"] = 0,' +
					//'["ETA_locked"] = true,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' + _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					//'["name"] = "waypoint 1",' +
					//'["formation_template"] = "",' +
					//'["speed_locked"] = true,' +
				'},' +
				'[2]={' +
					'["alt"] = 25,' +
					'["action"] = "Landing",' +
					'["alt_type"] = "BARO",' +
					'["speed"] = 168,' +
					'["task"]={' +
						'["id"] = "ComboTask",' +
						'["params"] = {' +
							'["tasks"]={' +
								'[1] = {' +
									'["number"] = 1,' +
									'["auto"] = false,' +
									'["id"] = "WrappedAction",' +
									'["enabled"] = true,' +
									'["params"] = {' +
										'["action"] = {' +
											'["id"] = "Option",' +
											'["params"] = {' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Land",' +
					//'["ETA"] = 712.36534243372,' +
					//'["ETA_locked"] = false,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
					//'["name"] = "DictKey_WptName_21362",' +
					//'["formation_template"] = "",' +
					'["airdromeId"] = ' + _.get(routes, 'baseId') + ',' +
					//'["speed_locked"] = true,' +
				'},' +
			'}' +
		'},'
	;
});

_.set(exports, 'landHeliRouteTemplate', function ( routes ) {
	return 	'' +
		'["route"] = {' +
			'["points"] = {' +
				'[1] = {' +
					'["alt"] = 500,' +
					'["action"] = "Turning Point",'+
					'["alt_type"] = "BARO",' +
					'["speed"] = 70,' +
					'["task"] = {'+
						'["id"] = "ComboTask",' +
						'["params"]={' +
							'["tasks"]={' +
								'[1]={' +
									'["enabled"]=true,' +
									'["auto"]=false,' +
									'["id"]="WrappedAction",' +
									'["number"] = 1,' +
									'["params"]={' +
										'["action"]={' +
											'["id"] = "Option",' +
											'["params"]={' +
												'["value"] = 2,' +
												'["name"] = 1,' +
											'},' +
										'},' +
									'},' +
								'},' +
								'[2] = {' +
									'["enabled"] = true,' +
									'["auto"]=false,' +
									'["id"]="Land",' +
									'["number"]= 2,' +
									'["params"]={' +
										'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').x, ' +
										'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 1, 1]) + ', ' + _.get(routes, ['routeLocs', 1, 0]) + ').z, ' +
										'["duration"] = 300,' +
										'["durationFlag"] = false,' +
									'},' +
								'},' +
							'},' +
						'},' +
					'},' +
					'["type"] = "Turning Point",' +
					//'["ETA"] = 0,' +
					//'["ETA_locked"] = true,' +
					'["x"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' +  _.get(routes, ['routeLocs', 0, 0]) + ').x, ' +
					'["y"] = coord.LLtoLO(' + _.get(routes, ['routeLocs', 0, 1]) + ', ' +  _.get(routes, ['routeLocs', 0, 0]) + ').z, ' +
					//'["name"] = "waypoint 1",' +
					//'["formation_template"] = "",' +
					//'["speed_locked"] = true,' +
				'},' +
			'},' +
		'},'
	;
});

_.set(exports, 'grndUnitGroup', function ( groupObj, task, routes ) {

	var curRoute = '';
	var curTask = (task) ? task : 'Ground Nothing';
	var uncontrollable = _.get(groupObj, 'playerCanDrive', false) === false;
	// console.log('uncontrol: ', uncontrollable, curTask);

	// console.log('hidden: ', groupObj);

	if (routes) {
		curRoute = routes;
	} else if (groupObj.type === '1L13 EWR' || groupObj.type === '55G6 EWR' ) {
		// console.log('turningOnRouteEWRInstructions: ', groupObj);
		curRoute = exports.turnOnEWRAuto();
	} else {
		curRoute = exports.turnOffDisperseUnderFire();
	}

	return '{' +
		//'["groupId"] = ' + _.get(groupObj, 'groupId') + ',' +
		'["communication"] = true,' +
		'["start_time"] = 0,' +
		'["frequency"] = 251,' +
		'["radioSet"] = false,' +
		'["modulation"] = 0,' +
		'["taskSelected"] = true,' +
		'["name"] = "' + _.get(groupObj, 'groupName') + '",' +
		'["visible"] = ' + _.get(groupObj, 'visible', false) + ',' +
		// '["hidden"] = ' + _.get(groupObj, 'hidden', true) + ',' +
		'["hidden"] = ' + _.get(groupObj, 'hidden', false) + ',' +
		'["uncontrollable"] = ' + uncontrollable + ',' +
		'["tasks"] = {},' +
		'["task"] = "' + _.get(groupObj, 'task', curTask) + '",' +
		'["taskSelected"] = true,' +
		'["units"] = {#UNITS},' +
		'["category"] = Group.Category.' + _.get(groupObj, 'category') + ',' +
		'["country"] = "' + _.get(groupObj, 'country') + '",' +
		curRoute +
	'}';
});

_.set(exports, 'grndUnitTemplate', function ( unitObj ) {
	return '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "' + _.get(unitObj, 'type') +'",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["playerCanDrive"] = ' + _.get(unitObj, 'playerCanDrive', false) + ',' +
		// '["playerCanDrive"] = false,' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'}'
	;
});

_.set(exports, 'mi24vTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["livery_id"] = "standard 1",' +
		'["type"] = "Mi-24V",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["payload"]={' +
			'["pylons"]={},' +
			'["fuel"] = "1704",' +
			'["flare"] = 192,' +
			'["chaff"] = 0,' +
			'["gun"] = 100,' +
		'},' +
	'},';

	return curAirTemplate;
});

_.set(exports, 'ah1wTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["livery_id"] = "USA X Black",' +
		'["type"] = "AH-1W",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["payload"]={' +
			'["pylons"]={},' +
				'["fuel"] = "1250",' +
				'["flare"] = 30,' +
				'["chaff"] = 30,' +
				'["gun"] = 100,' +
			'},' +
		'},';

	return curAirTemplate;
});

_.set(exports, 'mi28nTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "Mi-28N",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["hardpoint_racks"] = true,' +
		'["payload"]={' +
			'["pylons"]={' +
				'[1] = {' +
					'["CLSID"] = "{57232979-8B0F-4db7-8D9A-55197E06B0F5}",' +
				'},' +
			'},' +
			'["fuel"] = "1500",' +
			'["flare"] = 128,' +
			'["chaff"] = 0,' +
			'["gun"] = 100,' +
		'},' +
	'},';

	return curAirTemplate;
});

_.set(exports, 'ah64dTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "AH-64D",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["hardpoint_racks"] = true,' +
		'["payload"]={' +
			'["pylons"]={' +
				'[1] = {' +
					'["CLSID"] = "{88D18A5E-99C8-4B04-B40B-1C02F2018B6E}",' +
				'},' +
				'[4] = {' +
					'["CLSID"] = "{88D18A5E-99C8-4B04-B40B-1C02F2018B6E}",' +
				'},' +
			'},' +
			'["fuel"] = "1157",' +
			'["flare"] = 30,' +
			'["chaff"] = 30,' +
			'["gun"] = 50,' +
		'},' +
	'},';

	return curAirTemplate;
});

_.set(exports, 'b1bTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "B-1B",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["hardpoint_racks"] = true,' +
		'["payload"]={' +
			'["pylons"]={' +
				'[1] = {' +
					'["CLSID"] = "B-1B_Mk-84*8",' +
				'},' +
				'[2] = {' +
					'["CLSID"] = "GBU-31V3B*8",' +
				'},' +
				'[3] = {' +
					'["CLSID"] = "B-1B_Mk-84*8",' +
				'},' +
			'},' +
			'["fuel"] = "88450",' +
			'["flare"] = 30,' +
			'["chaff"] = 60,' +
			'["gun"] = 100,' +
		'},' +
	'},';

	return curAirTemplate;
});

_.set(exports, 'su24mTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "Su-24M",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["hardpoint_racks"] = true,' +
		'["payload"]={' +
			'["pylons"]={' +
				'[1] = {' +
					'["CLSID"] = "{3C612111-C7AD-476E-8A8E-2485812F4E5C}",' +
				'},' +
				'[2] = {' +
					'["CLSID"] = "{KAB_1500Kr_LOADOUT}",' +
				'},' +
				'[3] = {' +
					'["CLSID"] = "{E2C426E3-8B10-4E09-B733-9CDC26520F48}",' +
				'},' +
				'[4] = {' +
					'["CLSID"] = "{KAB_1500Kr_LOADOUT}",' +
				'},' +
				'[5] = {' +
					'["CLSID"] = "{3C612111-C7AD-476E-8A8E-2485812F4E5C}",' +
				'},' +
				'[6] = {' +
					'["CLSID"] = "{E2C426E3-8B10-4E09-B733-9CDC26520F48}",' +
				'},' +
				'[7] = {' +
					'["CLSID"] = "{KAB_1500Kr_LOADOUT}",' +
				'},' +
				'[8] = {' +
					'["CLSID"] = "{3C612111-C7AD-476E-8A8E-2485812F4E5C}",' +
				'},' +
			'},' +
			'["fuel"] = "11700",' +
			'["flare"] = 96,' +
			'["chaff"] = 96,' +
			'["gun"] = 100,' +
		'},' +
	'},';

	return curAirTemplate;
});

_.set(exports, 'airUnitTemplate', function ( unitObj ) {
	var curAirTemplate = '{' +
		'["x"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(unitObj, ['lonLatLoc', 1]) + ', ' +  _.get(unitObj, ['lonLatLoc', 0]) + ').z, ' +
		'["type"] = "' + _.get(unitObj, 'type') +'",' +
		'["name"] = "' + _.get(unitObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(unitObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(unitObj, 'heading', 0) + ',' +
		'["skill"] = "' + _.get(unitObj, 'skill', "Excellent") + '",' +
		'["payload"]={' +
			'["pylons"]={},' +
			'["fuel"] = "100000",' +
			'["flare"] = 200,' +
			'["chaff"] = 200,' +
			'["gun"] = 200,' +
		'},';

		if (unitObj.country === 'USA' || unitObj.country === 'AGGRESSORS') {
			// console.log('cs: ', unitObj);
			curAirTemplate = curAirTemplate + '["callsign"] = {' +
			'[1] = ' + _.get(unitObj, ['callsign', '1']) + ',' +
			'[2] = ' + _.get(unitObj, ['callsign', '2']) + ',' +
			'[3] = ' + _.get(unitObj, ['callsign', '3']) + ',' +
			'["name"] = "' + _.get(unitObj, 'callsign.name') + '",' +
			'},' +
			'["onboard_num"] = "' + _.get(unitObj, 'onboard_num') + '",';
		} else {
			curAirTemplate = curAirTemplate + '["callsign"] = "' + _.get(unitObj, 'callsign') + '",' +
			'["onboard_num"] = "' + _.get(unitObj, 'onboard_num') + '",';
		}
	curAirTemplate = curAirTemplate + '}';

		return curAirTemplate;
});

_.set(exports, 'staticTemplate', function (staticObj) {
	var retObj = '{' +
		'["x"] = coord.LLtoLO(' + _.get(staticObj, ['lonLatLoc', 1]) + ', ' +  _.get(staticObj, ['lonLatLoc', 0]) + ').x, ' +
		'["y"] = coord.LLtoLO(' + _.get(staticObj, ['lonLatLoc', 1]) + ', ' +  _.get(staticObj, ['lonLatLoc', 0]) + ').z, ' +
		'["category"] = "' + _.get(staticObj, 'category') + '",' +
		'["country"] = "' + _.get(staticObj, 'country') + '",' +
		'["type"] = "' + _.get(staticObj, 'type') +'",' +
		'["name"] = "' + _.get(staticObj, 'name') + '",' +
		// '["unitId"] = ' + _.get(staticObj, 'unitId') + ',' +
		'["heading"] = ' + _.get(staticObj, 'heading', 0) + ',' +
		'["shape_name"] = "' + _.get(staticObj, 'shape_name') + '",' +
		'["canCargo"] = ' + _.get(staticObj, 'canCargo', false) + ',';
		if (_.get(staticObj, 'canCargo', false)) {
			retObj += '["mass"] = "' + _.get(staticObj, 'mass') + '",';
		}
	retObj += '}';
	return retObj;
});

_.set(exports, 'getStaticDictionary', function () {
	return dbSystemLocalController.staticDictionaryActions('read')
		.then(function (staticDic) {
			return new Promise(function (resolve) {
				resolve(staticDic);
			});
		})
		.catch(function (err) {
			console.log('err line297: ', err);
		})
		;
});

_.set(exports, 'getUnitDictionary', function () {
	return dbSystemLocalController.unitDictionaryActions('read')
		.then(function (unitsDic) {
			return new Promise(function (resolve) {
				resolve(unitsDic);
			});
		})
		.catch(function (err) {
			console.log('err line310: ', err);
		})
	;
});

_.set(exports, 'getBases', function (serverName) {
	return dbMapServiceController.baseActions('read', serverName)
		.then(function (bases) {
			return new Promise(function (resolve) {
				if (bases.length) {
					resolve(bases);
				} else {
					console.log('Rebuilding Base DB');
					var actionObj = {actionObj: {action: "GETPOLYDEF"}, queName: 'clientArray'};
					dbMapServiceController.cmdQueActions('save', serverName, actionObj)
						.catch(function (err) {
							console.log('erroring line790: ', err);
						})
					;
					resolve('rebuild base DB');
				}
			});
		})
		.catch(function (err) {
			console.log('err line110: ', err);
		})
	;
});

_.set(exports, 'getServer', function ( serverName ) {
	return dbSystemLocalController.serverActions('read', {_id: serverName})
		.then(function (server) {
			return new Promise(function (resolve) {
				resolve(_.first(server));
			});
		})
		.catch(function (err) {
			console.log('err line101: ', err);
		})
		;
});

_.set(exports, 'getRndFromSpawnCat', function (spawnCat, side, spawnShow, spawnAlways) {
	var curEnabledCountrys = _.get(constants, [_.get(constants, ['side', side]) + 'Countrys']);
	var findUnits = _.filter(_.get(exports, 'unitDictionary'), {spawnCat: spawnCat, enabled: true});
	var cPUnits = [];
	var randomIndex;
	var unitsChosen = [];
	var curUnit;
	var curUnits = [];
	_.forEach(findUnits, function (unit) {
		if(_.intersection(_.get(unit, 'country'), curEnabledCountrys).length > 0) {
			cPUnits.push(unit);
		}
	});
	if (cPUnits.length < 0) {
		reject('cPUnits are less than zero');
	}
	if (spawnAlways) {
		randomIndex = _.random(0, cPUnits.length - 1);
	} else {
		randomIndex = _.random(0, cPUnits.length);
	}

	curUnit = cPUnits[randomIndex];
	if (curUnit) {
		if(curUnit.comboName) {
			curUnits = _.filter(cPUnits, {comboName: curUnit.comboName});
		} else {
			curUnits.push(curUnit);
		}

		if (curUnits.length > 0) {
			_.forEach(curUnits, function (cUnit) {
				for (y=0; y < cUnit.spawnCount; y++) {
					unitsChosen.push(cUnit);
				}
			})
		}
		if (spawnShow) {
			_.forEach(unitsChosen, function (unit) {
				_.set(unit, 'hidden', false);
			});
		}

		return unitsChosen;
	} else {
		return false;
	}
});

_.set(exports, 'spawnSupportVehiclesOnFarp', function ( serverName, baseName, side ) {
	var curBase = _.find(_.get(exports, ['bases']), {name: baseName});
	var curFarpArray = [];
	var sptArray = [
		"unarmedAmmo",
		"unarmedFuel",
		"unarmedPower"
	];
	var curAng = _.cloneDeep(curBase.hdg);
	if (curAng > 180) {
		curAng = curAng - 90
	} else {
		curAng = curAng + 270
	}
	_.forEach(sptArray, function (val) {
		var sptUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat(val, side, false, true)));
		_.set(sptUnit, 'name', baseName + '_' + val);
		_.set(sptUnit, 'lonLatLoc', zoneController.getLonLatFromDistanceDirection(_.get(curBase, ['centerLoc']), curAng, 0.05));
		curAng += 15;
		curFarpArray.push(sptUnit);
	});
	return curFarpArray;
});

_.set(exports, 'spawnSupportBaseGrp', function ( serverName, baseName, side, init ) {
	var curBaseObj = {};
	var spawnArray = [];
	var curBases = _.get(exports, ['bases']);
	var farpBases = _.filter(curBases, {farp: true});
	var expBases = _.filter(curBases, {expansion: true});
	// var curEnabledCountrys = _.get(constants, [_.get(constants, ['side', side]) + 'Countrys']);
	if (_.includes(baseName, 'FARP')) {
		var curFarpBases = _.filter(farpBases, function (farp) {
			return _.first(_.split(_.get(farp, 'name'), ' #')) === baseName && _.get(farp, 'unitSide') === side;
				// && !_.isEmpty(_.intersection([_.get(farp, 'country')], curEnabledCountrys));
		});
		// console.log('doesnty work: ', serverName, baseName, side, init, curFarpBases, farpBases);
		_.forEach(curFarpBases, function (farp) {
			spawnArray = _.concat(spawnArray, exports.spawnSupportVehiclesOnFarp( serverName, _.get(farp, 'name'), side ));
		});
	} else {
		var curExpBases = _.filter(expBases, function (exp) {
			return _.first(_.split(_.get(exp, 'name'), ' #')) === baseName + '_Expansion' && _.get(exp, 'unitSide') === side;
				//&& !_.isEmpty(_.intersection([_.get(exp, 'country')], curEnabledCountrys));
		});
		_.forEach(curExpBases, function (exp) {
			spawnArray = _.concat(spawnArray, exports.spawnSupportVehiclesOnFarp( serverName, _.get(exp, 'name'), side ));
		});
	}

	for (var i = 0; i < 3; i++) {
		spawnArray = _.concat(spawnArray, _.cloneDeep(exports.getRndFromSpawnCat( 'APC', side, false )));
	}

	return _.compact(spawnArray);
});

_.set(exports, 'spawnBaseReinforcementGroup', function (serverName, side, baseName) {
	var curServer = _.get(exports, ['config']);
	var spawnArray = [];
	var curBaseSpawnCats = _.get(curServer, 'spwnLimitsPerTick');
	_.forEach(curBaseSpawnCats, function (tickVal, name) {
		var curTickVal = _.cloneDeep(tickVal);
		if(_.includes(baseName, 'FARP')) {
			curTickVal = curTickVal - 1;
		}
		if (curTickVal > 0) {
			for (var i = 0; i < curTickVal; i++) {
				spawnArray = _.concat(spawnArray, _.cloneDeep(exports.getRndFromSpawnCat( name, side, false )));
			}
		}
	});
	return _.compact(spawnArray);
});

_.set(exports, 'spawnDefenseChopper', function (serverName, playerUnitObj, unitObj) {
	var curTkrName;
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curCountry;
	var curSpwnUnit;
	var curGrpObj = {};
	var friendlyLoc;
	var curCategory = 'HELICOPTER';

	curCountry = unitObj.country;
	curTkrName = 'AI|' + unitObj.name + '|';
	curSpwnUnit = _.cloneDeep(unitObj);

	dbMapServiceController.baseActions('getClosestFriendlyBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc, playerSide: playerUnitObj.coalition})
		.then(function (friendlyBase) {
			var patrolDistance = 2;
			friendlyLoc = zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 0, patrolDistance);
			curGrpObj = _.cloneDeep(curSpwnUnit);
			_.set(curGrpObj, 'groupName', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curGrpObj, 'country', curCountry);
			_.set(curGrpObj, 'category', curCategory);
			_.set(curGrpObj, 'alt', _.parseInt(unitObj.alt) + _.parseInt(friendlyBase.alt));
			_.set(curGrpObj, 'routeLocs', [
				friendlyLoc,
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 45, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 90, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 135, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 180, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 225, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 270, patrolDistance),
				zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, 315, patrolDistance)
			]);

			curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'CAS', exports.defenseHeliRouteTemplate(curGrpObj));

			_.set(curSpwnUnit, 'lonLatLoc', friendlyLoc);
			_.set(curSpwnUnit, 'name', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curSpwnUnit, 'playerCanDrive', false);
			_.set(curSpwnUnit, 'hidden', false);

			if (unitObj.name === 'RussianDefHeli') {
				for(x=0; x < 2; x++) {
					curUnitSpawn += exports.mi24vTemplate(curSpwnUnit);
				}
			}
			if (unitObj.name === 'USADefHeli') {
				for(x=0; x < 2; x++) {
					curUnitSpawn += exports.ah1wTemplate(curSpwnUnit);
				}
			}

			curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
			var curCMD = exports.spawnGrp(curGroupSpawn, curCountry, curCategory);
			var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj)
				.then(function () {
					var mesg = 'C: A pair of ' + unitObj.type + ' is defending ' + friendlyBase.name;
					DCSLuaCommands.sendMesgToCoalition(
						playerUnitObj.coalition,
						serverName,
						mesg,
						20
					);
				})
				.catch(function (err) {
					console.log('erroring line1400: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line1405: ', err);
		})
	;
});

_.set(exports, 'spawnAtkChopper', function (serverName, playerUnitObj, unitObj) {
	var curTkrName;
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curCountry;
	var curSpwnUnit;
	var curGrpObj = {};
	var friendlyLoc;
	var enemyLoc;
	var curCategory = 'HELICOPTER';

	curCountry = unitObj.country;
	curTkrName = 'AI|' + unitObj.name + '|';
	curSpwnUnit = _.cloneDeep(unitObj);

	dbMapServiceController.baseActions('getClosestEnemyBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc, playerSide: playerUnitObj.coalition})
		.then(function (enemyBase) {
			dbMapServiceController.baseActions('getClosestFriendlyBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc, playerSide: playerUnitObj.coalition})
				.then(function (friendlyBase) {
					//friendlyLoc = zoneController.getLonLatFromDistanceDirection(enemyBase.centerLoc, enemyBase.spawnAngle, curSpwnUnit.spawnDistance);
					friendlyLoc = zoneController.getLonLatFromDistanceDirection(friendlyBase.centerLoc, zoneController.findBearing(friendlyBase.centerLoc[1], friendlyBase.centerLoc[0], enemyBase.centerLoc[1], enemyBase.centerLoc[0]), 10);
					enemyLoc = enemyBase.centerLoc;

					curGrpObj = _.cloneDeep(curSpwnUnit);
					_.set(curGrpObj, 'groupName', curTkrName + '#' + _.random(1000000, 9999999));
					_.set(curGrpObj, 'country', curCountry);
					_.set(curGrpObj, 'category', curCategory);
					_.set(curGrpObj, 'alt', _.parseInt(unitObj.alt) + _.parseInt(friendlyBase.alt));
					_.set(curGrpObj, 'routeLocs', [
						friendlyLoc,
						enemyLoc
					]);

					curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'CAS', exports.atkHeliRouteTemplate(curGrpObj));

					_.set(curSpwnUnit, 'lonLatLoc', friendlyLoc);
					_.set(curSpwnUnit, 'name', curTkrName + '#' + _.random(1000000, 9999999));
					_.set(curSpwnUnit, 'playerCanDrive', false);
					_.set(curSpwnUnit, 'hidden', false);

					if (unitObj.name === 'RussianAtkHeli') {
						for(x=0; x < 2; x++) {
							curUnitSpawn += exports.mi28nTemplate(curSpwnUnit);
						}
					}
					if (unitObj.name === 'USAAtkHeli') {
						for(x=0; x < 2; x++) {
							curUnitSpawn += exports.ah64dTemplate(curSpwnUnit);
						}
					}

					curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
					var curCMD = exports.spawnGrp(curGroupSpawn, curCountry, curCategory);
					var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
					var actionObj = {actionObj: sendClient, queName: 'clientArray'};
					dbMapServiceController.cmdQueActions('save', serverName, actionObj)
						.then(function () {
							var mesg = 'C: ' + unitObj.type + ' Atk Heli is departed ' + friendlyBase.name + ' and it is patrolling toward ' + enemyBase.name;
							DCSLuaCommands.sendMesgToCoalition(
								playerUnitObj.coalition,
								serverName,
								mesg,
								20
							);
						})
						.catch(function (err) {
							console.log('erroring line1026: ', err);
						})
					;
				})
				.catch(function (err) {
					console.log('erroring line1031: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line1036: ', err);
		})
	;
});

_.set(exports, 'spawnBomberPlane', function (serverName, playerUnitObj, bomberObj) {
	var curTkrName;
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curCountry;
	var curSpwnUnit;
	var curGrpObj = {};
	var remoteLoc;
	var closeLoc;
	var curCategory = 'AIRPLANE';

	curCountry = bomberObj.country;
	curTkrName = 'AI|' + bomberObj.name + '|';
	curSpwnUnit = _.cloneDeep(bomberObj);

	dbMapServiceController.baseActions('getClosestEnemyBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc, playerSide: playerUnitObj.coalition})
		.then(function (closeBase) {
			// console.log('CB: ', closeBase);
			remoteLoc = zoneController.getLonLatFromDistanceDirection(closeBase.centerLoc, closeBase.spawnAngle, curSpwnUnit.spawnDistance);
			closeLoc = zoneController.getLonLatFromDistanceDirection(closeBase.centerLoc, closeBase.spawnAngle, 7);

			curGrpObj = _.cloneDeep(curSpwnUnit);
			_.set(curGrpObj, 'groupName', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curGrpObj, 'country', curCountry);
			_.set(curGrpObj, 'category', curCategory);
			_.set(curGrpObj, 'alt', _.parseInt(bomberObj.alt) + _.parseInt(closeBase.alt));
			_.set(curGrpObj, 'routeLocs', [
				remoteLoc,
				closeLoc
			]);

			curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'CAS', exports.bombersPlaneRouteTemplate(curGrpObj));

			_.set(curSpwnUnit, 'lonLatLoc', remoteLoc);
			_.set(curSpwnUnit, 'name', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curSpwnUnit, 'playerCanDrive', false);
			_.set(curSpwnUnit, 'hidden', false);

			if (bomberObj.name === 'RussianBomber') {
				for(x=0; x < 4; x++) {
					curUnitSpawn += exports.su24mTemplate(curSpwnUnit);
				}
			}
			if (bomberObj.name === 'USABomber') {
				curUnitSpawn = exports.b1bTemplate(curSpwnUnit);
			}

			curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
			var curCMD = exports.spawnGrp(curGroupSpawn, curCountry, curCategory);
			var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj)
				.then(function () {
					var mesg = 'C: ' + bomberObj.type + ' Bomber is commencing its run BRA ' + closeBase.spawnAngle + ' from ' + closeBase.name + ' ' + bomberObj.details;
					DCSLuaCommands.sendMesgToCoalition(
						playerUnitObj.coalition,
						serverName,
						mesg,
						20
					);
				})
				.catch(function (err) {
					console.log('erroring line428: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line632: ', err);
		})
	;
});

_.set(exports, 'spawnAWACSPlane', function (serverName, playerUnitObj, awacsObj) {
	var curTkrName;
	var curUnitSpawn;
	var curGroupSpawn;
	var curCountry;
	var curSpwnUnit;
	var curGrpObj = {};
	var remoteLoc;
	var curCategory = 'AIRPLANE';

	curCountry = awacsObj.country;
	curTkrName = 'AI|' + awacsObj.name + '|';
	curSpwnUnit = _.cloneDeep(awacsObj);

	dbMapServiceController.baseActions('getClosestBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc})
		.then(function (closeBase) {
			// console.log('CB: ', closeBase);
			remoteLoc = zoneController.getLonLatFromDistanceDirection(playerUnitObj.lonLatLoc, playerUnitObj.hdg, curSpwnUnit.spawnDistance);

			curGrpObj = _.cloneDeep(curSpwnUnit);
			_.set(curGrpObj, 'groupName', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curGrpObj, 'country', curCountry);
			_.set(curGrpObj, 'category', curCategory);
			_.set(curGrpObj, 'routeLocs', [
				remoteLoc,
				playerUnitObj.lonLatLoc
			]);

			curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'AWACS', exports.awacsPlaneRouteTemplate(curGrpObj));

			_.set(curSpwnUnit, 'lonLatLoc', remoteLoc);
			_.set(curSpwnUnit, 'name', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curSpwnUnit, 'playerCanDrive', false);
			_.set(curSpwnUnit, 'hidden', false);

			curUnitSpawn = exports.airUnitTemplate(curSpwnUnit);

			curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
			var curCMD = exports.spawnGrp(curGroupSpawn, curCountry, curCategory);
			var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj)
				.then(function () {
					var mesg = 'C: A ' + awacsObj.type + ' AWACS Has Been Spawned ' + playerUnitObj.hdg + ' from ' + closeBase.name + ' ' + awacsObj.details;
					DCSLuaCommands.sendMesgToCoalition(
						playerUnitObj.coalition,
						serverName,
						mesg,
						20
					);
				})
				.catch(function (err) {
					console.log('erroring line428: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line632: ', err);
		})
	;
});

_.set(exports, 'spawnTankerPlane', function (serverName, playerUnitObj, tankerObj) {
	var curTkrName;
	var curUnitSpawn;
	var curGroupSpawn;
	var curCountry;
	var curSpwnUnit;
	var curGrpObj = {};
	var remoteLoc;
	var curCategory = 'AIRPLANE';

	curCountry = tankerObj.country;
	curTkrName = 'AI|' + tankerObj.name + '|';
	curSpwnUnit = _.cloneDeep(tankerObj);

	dbMapServiceController.baseActions('getClosestBase', serverName, { unitLonLatLoc: playerUnitObj.lonLatLoc})
		.then(function (closeBase) {
			// console.log('CB: ', closeBase);
			remoteLoc = zoneController.getLonLatFromDistanceDirection(playerUnitObj.lonLatLoc, playerUnitObj.hdg, curSpwnUnit.spawnDistance);

			curGrpObj = _.cloneDeep(curSpwnUnit);
			_.set(curGrpObj, 'groupName', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curGrpObj, 'country', curCountry);
			_.set(curGrpObj, 'category', curCategory);
			_.set(curGrpObj, 'routeLocs', [
				remoteLoc,
				playerUnitObj.lonLatLoc
			]);

			curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'Refueling', exports.tankerPlaneRouteTemplate(curGrpObj));

			_.set(curSpwnUnit, 'lonLatLoc', remoteLoc);
			_.set(curSpwnUnit, 'name', curTkrName + '#' + _.random(1000000, 9999999));
			_.set(curSpwnUnit, 'playerCanDrive', false);
			_.set(curSpwnUnit, 'hidden', false);

			curUnitSpawn = exports.airUnitTemplate(curSpwnUnit);

			curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
			var curCMD = exports.spawnGrp(curGroupSpawn, curCountry, curCategory);
			var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
			var actionObj = {actionObj: sendClient, queName: 'clientArray'};
			dbMapServiceController.cmdQueActions('save', serverName, actionObj)
				.then(function () {
					var mesg = 'C: A ' + tankerObj.type + ' Tanker Has Been Spawned ' + playerUnitObj.hdg + ' from ' + closeBase.name + ' ' + tankerObj.details;
					DCSLuaCommands.sendMesgToCoalition(
						playerUnitObj.coalition,
						serverName,
						mesg,
						20
					);
				})
				.catch(function (err) {
					console.log('erroring line428: ', err);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line632: ', err);
		})
	;
});

_.set(exports, 'spawnSupportPlane', function (serverName, baseObj, side, farpBase) {
	var unitNum;
	var curBaseName;
	var curUnitName;
	var curUnitSpawn;
	var curGroupSpawn;
	var curSide;
	var curSpwnUnit;
	var curGrpObj = {};
	var curRoutes;
	var baseLoc;
	var remoteLoc;
	var grpNum = _.random(1000000, 9999999);

	curSide = (side) ? _.get(constants, ['defCountrys', side]) : _.get(constants, ['defCountrys', _.get(curGrpObj, 'coalition')]);
	curBaseName = 'AI|1010101|' + _.get(baseObj, 'name') + '|LOGISTICS|';
	if (_.get(baseObj, 'farp', false)) {
		baseLoc = _.get(farpBase, 'centerLoc');
		console.log('FARP BASE: ', baseLoc);
	} else {
		baseLoc = _.get(baseObj, 'centerLoc');
		console.log('REG BASE: ', baseLoc);
	}

	if(_.get(baseObj, 'farp')) {
		curSpwnUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat( 'transportHeli', side, true, true )));
		// remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.get(baseObj, 'spawnAngle'), 40);
		remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.random(0, 359), 40);
	} else {
		curSpwnUnit = _.cloneDeep(_.first(exports.getRndFromSpawnCat( 'transportAircraft', side, true, true )));
		remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.get(baseObj, 'spawnAngle'), 70);
		// remoteLoc = zoneController.getLonLatFromDistanceDirection(baseLoc, _.random(0, 359), 70);
	}
	curGrpObj = _.cloneDeep(curSpwnUnit);
	_.set(curGrpObj, 'groupId', grpNum);
	_.set(curGrpObj, 'groupName', curBaseName);
	_.set(curGrpObj, 'country', curSide);
	curRoutes = {
		baseId: _.get(baseObj, 'baseId'),
		routeLocs: [
			remoteLoc,
			baseLoc
		]
	};
	if(_.get(baseObj, 'farp')) {
		curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'Transport', exports.landHeliRouteTemplate(curRoutes));
	} else {
		curGroupSpawn = exports.grndUnitGroup( curGrpObj, 'Transport', exports.landPlaneRouteTemplate(curRoutes));
	}

	unitNum = _.cloneDeep(grpNum);

	unitNum += 1;
	curUnitName = 'AI|1010101|' + _.get(baseObj, 'name') + '|LOGISTICS|';


	_.set(curSpwnUnit, 'lonLatLoc', remoteLoc);
	// _.set(curSpwnUnit, 'unitId', unitNum);
	_.set(curSpwnUnit, 'name', curUnitName);
	_.set(curSpwnUnit, 'playerCanDrive', false);
	_.set(curSpwnUnit, 'hidden', false);

	curUnitSpawn = exports.airUnitTemplate(curSpwnUnit);

	curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
	// console.log('spawnSupportPlane: ', curGroupSpawn, curSide, curGrpObj.category);
	var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
	var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line428: ', err);
		})
	;
});

_.set(exports, 'spawnLogiGroup', function (serverName, spawnArray, side) {
	var grpNum = 0;
	var unitNum = 0;
	var unitVec2;
	var curBaseName = '';
	var curUnitName = '';
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curGrpObj = {};
	var curSide;
	var curSpwnUnit;
	var sArray = _.compact(_.cloneDeep(spawnArray));
	curGrpObj = _.get(sArray, 0);
	if (curGrpObj) {
		grpNum = _.get(curGrpObj, 'groupId', _.random(1000000, 9999999));
		curSide = (side) ? _.get(constants, ['defCountrys', side]) : _.get(constants, ['defCountrys', _.get(curGrpObj, 'coalition')]);
		if(curGrpObj.country === 'UKRAINE') {
			curSide = 'UKRAINE';
		}

		curBaseName = curGrpObj.spwnName + ' #' + grpNum;

		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curBaseName);
		_.set(curGrpObj, 'country', curSide);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );
		unitNum = _.cloneDeep(grpNum);
		_.forEach(sArray, function (curUnit) {
			curSpwnUnit = _.cloneDeep(curUnit);
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = curSpwnUnit.spwnName + ' #' + unitNum;

			_.set(curSpwnUnit, 'lonLatLoc', zoneController.getLonLatFromDistanceDirection(curSpwnUnit.lonLatLoc, curSpwnUnit.heading, 0.05));
			// _.set(curSpwnUnit, 'unitId', _.get(curSpwnUnit, 'unitId', unitNum));
			_.set(curSpwnUnit, 'name', curUnitName);
			_.set(curSpwnUnit, 'playerCanDrive', _.get(curSpwnUnit, 'playerCanDrive', true));
			curUnitSpawn += exports.grndUnitTemplate(curSpwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
		// var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
		var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
		var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
		dbMapServiceController.cmdQueActions('save', serverName, actionObj)
			.catch(function (err) {
				console.log('erroring line1816: ', err);
			})
		;
	}
});

_.set(exports, 'spawnGroup', function (serverName, spawnArray, baseName, side) {
	var grpNum = 0;
	var unitNum = 0;
	var unitVec2;
	var curBaseName = '';
	var curUnitName = '';
	var curUnitSpawn = '';
	var curGroupSpawn;
	var curGrpObj = {};
	var curSide;
	var curSpwnUnit;
	var sArray = _.compact(_.cloneDeep(spawnArray));
	curGrpObj = _.get(sArray, 0);
	if (curGrpObj) {
		grpNum = _.get(curGrpObj, 'groupId', _.random(1000000, 9999999));
		curSide = (side) ? _.get(constants, ['defCountrys', side]) : _.get(curGrpObj, 'country', _.get(constants, ['defCountrys', _.get(curGrpObj, 'coalition')]));
		curBaseName = (baseName) ? baseName + ' #' + grpNum : _.get(curGrpObj, 'groupName');
		_.set(curGrpObj, 'groupId', grpNum);
		_.set(curGrpObj, 'groupName', curBaseName);
		_.set(curGrpObj, 'country', curSide);
		curGroupSpawn = exports.grndUnitGroup( curGrpObj );
		unitNum = _.cloneDeep(grpNum);
		_.forEach(sArray, function (curUnit) {
			curSpwnUnit = _.cloneDeep(curUnit);
			if(unitNum !== grpNum) {
				curUnitSpawn += ','
			}
			unitNum += 1;
			curUnitName = baseName + ' #' + unitNum;

			if (_.isUndefined(_.get(curSpwnUnit, 'lonLatLoc'))) {
				_.set(curSpwnUnit, 'lonLatLoc', zoneController.getRandomLatLonFromBase(serverName, baseName));
			}
			// _.set(curSpwnUnit, 'unitId', _.get(curSpwnUnit, 'unitId', unitNum));
			_.set(curSpwnUnit, 'name', _.get(curSpwnUnit, 'name', curUnitName));
			curUnitSpawn += exports.grndUnitTemplate(curSpwnUnit);
		});
		curGroupSpawn = _.replace(curGroupSpawn, "#UNITS", curUnitSpawn);
		// var curCMD = 'mist.dynAdd(' + curGroupSpawn + ')';
		var curCMD = exports.spawnGrp(curGroupSpawn, curSide, curGrpObj.category);
		// console.log('cmd: ', curCMD);
		var sendClient = {action: "CMD", cmd: [curCMD], reqID: 0};
		var actionObj = {actionObj: sendClient, queName: 'clientArray'};
		dbMapServiceController.cmdQueActions('save', serverName, actionObj)
			.catch(function (err) {
				console.log('erroring line525: ', err);
			})
		;
	}
});

_.set(exports, 'spawnNewMapGrps', function ( serverName ) {
	var totalUnitsSpawned = 0;
	var curServer = _.get(exports, ['config']);
	var defBaseSides = _.get(curServer, 'defBaseSides');
    console.log('sng: ', serverName, curServer, defBaseSides);
	_.forEach(defBaseSides, function (extSide, extName) {
		var spawnArray = [];
		var curReplenThreshold;
        console.log('1');
		spawnArray = _.concat(spawnArray, exports.spawnSupportBaseGrp(serverName, extName, extSide, true));
        console.log('2');
		if(_.includes(extName, 'FARP')) {
			curReplenThreshold = curServer.replenThresholdFARP;
		} else {
			curReplenThreshold = curServer.replenThresholdBase;
		}
		console.log('3');
		while (spawnArray.length < curReplenThreshold) { //UNCOMMENT THESE
			spawnArray = _.concat(spawnArray, exports.spawnBaseReinforcementGroup(serverName, extSide, extName));
		}
        console.log('4');
		exports.spawnGroup(serverName, spawnArray, extName, extSide);
        console.log('5	');
		exports.spawnLogisticCmdCenter(serverName, {}, true, _.find(exports.bases, {name: extName}), extSide);
		totalUnitsSpawned += spawnArray.length + 1;
	});
    console.log('6', totalUnitsSpawned);
	return totalUnitsSpawned
});

_.set(exports, 'initDbs', function ( serverName ) {
	exports.getStaticDictionary()
		.then(function (staticDict) {
			_.set(exports, 'staticDictionary', staticDict);
			exports.getUnitDictionary()
				.then(function (unitDict) {
					_.set(exports, 'unitDictionary', unitDict);
					exports.getBases(serverName)
						.then(function (bases) {
							_.set(exports, ['bases'], bases);
							exports.getServer(serverName)
								.then(function (server) {
									_.set(exports, ['config'], server);
								})
							;

						})
					;

				})
			;
		})
	;
});

_.set(exports, 'spawnLogisticCmdCenter', function (serverName, staticObj, init, baseObj, side) {
	// console.log('spawnLogi: ', serverName, staticObj, init, baseObj, side);
	var curGrpObj = _.cloneDeep(staticObj);
	_.set(curGrpObj, 'name', _.get(curGrpObj, 'name', _.get(baseObj, 'name', '') + ' Logistics'));
	_.set(curGrpObj, 'coalition', _.get(curGrpObj, 'coalition', side));
	_.set(curGrpObj, 'country', _.get(constants, ['defCountrys', curGrpObj.coalition]));
	if (_.isUndefined(_.get(curGrpObj, 'lonLatLoc'))) {
		_.set(curGrpObj, 'lonLatLoc',  zoneController.getLonLatFromDistanceDirection(_.get(baseObj, ['logiCenter']), 0, 0.05));
	}
	_.set(curGrpObj, 'category', 'Fortifications');
	_.set(curGrpObj, 'type', '.Command Center');
	_.set(curGrpObj, 'shape_name', 'ComCenter');

	var curCMD = exports.spawnStatic(serverName, exports.staticTemplate(curGrpObj), curGrpObj.country, curGrpObj.name, init);
	var sendClient = {action: "CMD", cmd: curCMD, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line592: ', err);
		})
	;
	dbMapServiceController.unitActions('updateByName', serverName, {name: curGrpObj.name, coalition: curGrpObj.coalition, country: curGrpObj.country, dead:false})
		.catch(function (err) {
			console.log('erroring line595: ', err);
		})
	;
});

_.set(exports, 'replenishUnits', function ( serverName, baseName, side ) {
	exports.spawnGroup(serverName, exports.spawnBaseReinforcementGroup(serverName, side, baseName), baseName, side);
});

_.set(exports, 'destroyUnit', function ( serverName, unitName ) {
	// DONT USE ON CLIENT AIRCRAFT
	var sendClient = {action: "REMOVEOBJECT", removeObject: unitName, reqID: 0};
	var actionObj = {actionObj: sendClient, queName: 'clientArray'};
	dbMapServiceController.cmdQueActions('save', serverName, actionObj)
		.catch(function (err) {
			console.log('erroring line613: ', err);
		})
	;
});

_.set(exports, 'healBase', function ( serverName, baseName ) {
	//respawn farp tower to 'heal' it
	dbMapServiceController.unitActions('read', serverName, {name: baseName + ' Logistics', proxChkGrp: 'logisticTowers'})
		.then(function (logiUnit) {
			var curUnit = _.get(logiUnit, [0], {});
			dbMapServiceController.baseActions('read', serverName, {name: baseName, $or: [{side: 1}, {side: 2}]})
				.then(function (baseUnit) {
					var curBase = _.get(baseUnit, [0], {});
					if (curUnit) {
						_.set(curUnit, 'coalition', _.get(curBase, 'side'));
						// console.log('creating logistics from existing: ', serverName, curUnit, false, curBase, curBase.side);
						exports.spawnLogisticCmdCenter(serverName, curUnit, false, curBase, curBase.side);
					} else {
						// console.log('creating NEW logistics: ', serverName, {}, false, curBase, curBase.side);
						exports.spawnLogisticCmdCenter(serverName, {}, false, curBase, curBase.side);
					}

					//rebuild farp support vehicles
					exports.spawnGroup(serverName, exports.spawnSupportBaseGrp( serverName, curBase.name, curBase.side ), curBase.name, curBase.side);
				})
				.catch(function (err) {
						console.log('erroring line657: ', err, serverName, curUnit);
				})
			;
		})
		.catch(function (err) {
			console.log('erroring line662: ', err);
		})
	;
});

_.set(exports, 'loadOnDemandGroup', function ( groupObj ) {

});

_.set(exports, 'unloadOnDemandGroup', function ( groupObj ) {

});
