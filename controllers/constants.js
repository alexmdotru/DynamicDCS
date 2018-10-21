const _ = require('lodash');
const masterDBController = require('./db/masterDB');

_.assign(exports, {
	blueCountrys: [
		'AUSTRALIA',
		'AUSTRIA',
		'BELGIUM',
		'BULGARIA',
		'CANADA',
		'CROATIA',
		'CHEZH_REPUBLI',
		'DENMARK',
		'IRAQ',
		'GEORGIA',
		'GERMANY',
		'GREECE',
		'INDIA',
		'ITALY',
		'NORWAY',
		'POLAND',
		'SOUTH_KOREA',
		'SPAIN',
		'SWEDEN',
		'SWITZERLAND',
		'THE_NETHERLANDS',
		'SWITZERLAND',
		'UK',
		'USA',
		'AGGRESSORS',
		'KAZAKHSTAN',
		'UKRAINE'
	],
	countryId: [
		'RUSSIA',
		'UKRAINE',
		'USA',
		'TURKEY',
		'UK',
		'FRANCE',
		'GERMANY',
		'AGGRESSORS',
		'CANADA',
		'SPAIN',
		'THE_NETHERLANDS',
		'BELGIUM',
		'NORWAY',
		'DENMARK',
		'ISRAEL',
		'GEORGIA',
		'INSURGENTS',
		'ABKHAZIA',
		'SOUTH_OSETIA',
		'ITALY',
		'AUSTRALIA',
		'SWITZERLAND',
		'AUSTRIA',
		'BELARUS',
		'BULGARIA',
		'CHEZH_REPUBLIC',
		'CHINA',
		'CROATIA',
		'EGYPT',
		'FINLAND',
		'GREECE',
		'HUNGARY',
		'INDIA',
		'IRAN',
		'IRAQ',
		'JAPAN',
		'KAZAKHSTAN',
		'NORTH_KOREA',
		'PAKISTAN',
		'POLAND',
		'ROMANIA',
		'SAUDI_ARABIA',
		'SERBIA',
		'SLOVAKIA',
		'SOUTH_KOREA',
		'SWEDEN',
		'SYRIA',
		'YEMEN',
		'VIETNAM',
		'VENEZUELA',
		'TUNISIA',
		'THAILAND',
		'SUDAN',
		'PHILIPPINES',
		'MOROCCO',
		'MEXICO',
		'MALAYSIA',
		'LIBYA',
		'JORDAN',
		'INDONESIA',
		'HONDURAS',
		'ETHIOPIA',
		'CHILE',
		'BRAZIL',
		'BAHRAIN',
		'THIRDREICH',
		'YUGOSLAVIA',
		'USSR',
		'ITALIAN_SOCIAL_REPUBLIC',
		'ALGERIA',
		'KUWAIT',
		'QATAR',
		'OMAN',
		'UNITED_ARAB_EMIRATES'
	],
	defCountrys: {
		1: 'RUSSIA',
		2: 'USA'
	},
	discordToken: 'NDE2MDg4NDU4OTE0ODI0MTky.DW_Yow.iFoJ53gRt49pElbgduS-NVdK3II',
	enemyCountry: {
		1: 2,
		2: 1
	},
	maxLifePoints: 18,
	redCountrys: [
		'ABKHAZIA',
		'BELARUS',
		'CHINA',
		'EGYPT',
		'FINLAND',
		'HUNGARY',
		'INSURGENTS',
		'IRAN',
		'FRANCE',
		'ISRAEL',
		'JAPAN',
		'NORTH_KOREA',
		'PAKISTAN',
		'ROMANIA',
		'RUSSIA',
		'SAUDI_ARABIA',
		'SERBIA',
		'SLOVAKIA',
		'SOUTH_OSETIA',
		'SYRIA',
		'ALGERIA',
		'KUWAIT',
		'QATAR',
		'OMAN',
		'UNITED_ARAB_EMIRATES',
		'TURKEY'
	],
	side: [
		"neutral",
		"red",
		"blue"
	],
	shortNames: {
		players: 'TR',
		friendly_fire: 'FF',
		self_kill: 'SK',
		connect: 'C',
		disconnect: 'D',
		S_EVENT_SHOT: 'ST',
		S_EVENT_HIT: 'HT',
		S_EVENT_TAKEOFF: 'TO',
		S_EVENT_LAND: 'LA',
		S_EVENT_CRASH: 'CR',
		S_EVENT_EJECTION: 'EJ',
		S_EVENT_REFUELING: 'SR',
		S_EVENT_DEAD: 'D',
		S_EVENT_PILOT_DEAD: 'PD',
		S_EVENT_REFUELING_STOP: 'RS',
		S_EVENT_BIRTH: 'B',
		S_EVENT_PLAYER_ENTER_UNIT: 'EU',
		S_EVENT_PLAYER_LEAVE_UNIT: 'LU'
	},
	time: {
		sec: 1000,
		twoSec: 2 * 1000,
		fifteenSecs: 15 * 1000,
		fiveMins: 5 * 60 * 1000,
		fiveSecs: 5 * 1000,
		oneHour: 60 * 60 * 100,
		oneMin: 60 * 1000,
		thirtySecs: 30 * 1000,
		tenMinutes: 10 * 60 * 1000
	},
	getBases: function (serverName) {
		return masterDBController.baseActions('read', serverName)
			.then(function (bases) {
				return new Promise(function (resolve) {
					if (bases.length) {
						resolve(bases);
					} else {
						console.log('Rebuilding Base DB');
						var actionObj = {actionObj: {action: "GETPOLYDEF"}, queName: 'clientArray'};
						masterDBController.cmdQueActions('save', serverName, actionObj)
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
	},
	getServer: function ( serverName ) {
		return masterDBController.serverActions('read', {_id: serverName})
			.then(function (server) {
				return new Promise(function (resolve) {
					resolve(_.first(server));
				});
			})
			.catch(function (err) {
				console.log('err line101: ', err);
			})
			;
	},
	getStaticDictionary: function () {
		return masterDBController.staticDictionaryActions('read')
			.then(function (staticDic) {
				return new Promise(function (resolve) {
					resolve(staticDic);
				});
			})
			.catch(function (err) {
				console.log('err line297: ', err);
			})
			;
	},
	getUnitDictionary: function () {
		return masterDBController.unitDictionaryActions('read')
			.then(function (unitsDic) {
				return new Promise(function (resolve) {
					resolve(unitsDic);
				});
			})
			.catch(function (err) {
				console.log('err line310: ', err);
			})
			;
	},
	initServer: function ( serverName ) {
		return exports.getStaticDictionary()
			.then(function (staticDict) {
				_.set(exports, 'staticDictionary', staticDict);
				return exports.getUnitDictionary()
					.then(function (unitDict) {
						_.set(exports, 'unitDictionary', unitDict);
						return exports.getBases(serverName)
							.then(function (bases) {
								_.set(exports, 'bases', bases);
								return exports.getServer(serverName)
									.then(function (server) {
										_.set(exports, 'config', server);
									})
								;

							})
						;

					})
				;
			})
		;
	}
});

