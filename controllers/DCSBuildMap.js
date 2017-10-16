const _ = require('lodash');

const dbSystemServiceController = require('./dbSystemService');
const dbMapServiceController = require('./dbMapService');
const DCSLuaCommands = require('./DCSLuaCommands');

_.set(exports, 'buildDynamicMap', function (serverName) {
	console.log('build dynamic caucasus');
	dbMapServiceController.unitActions('read', serverName, '{category: "GROUND"}')
		.then(function (units) {
			console.log('unitsLength: ', units.length);
			if (units.length > 20) {
				console.log('repopUnitsFromDB');
				//repop units at base
				var remappedunits = {};
				_.forEach(units, function (unit) {
					_.set(remappedunits, _.get(unit, 'groupName'), _.get(remappedunits, _.get(unit, 'groupName'), []));
					remappedunits[_.get(unit, 'groupName')].push(unit);
				});
				_.forEach(remappedunits, function (group) {
					DCSLuaCommands.spawnGroup(serverName, group);
				});

			} else {
				//build map from scratch
				console.log('popUnitsFromScratch');
				dbMapServiceController.cmdQueActions('save', serverName, {queName: 'clientArray', actionObj: {action: "GETPOLYDEF"}});
			}
		})
		.catch(function (err) {
			console.log('erroring line29: ', err);
		})
	;

	/*
		1. roadMap:
			a. LUA
				1. send over airbase table from internal list on init
				2. update static buildings like the grouped units, include health
				3. keep local table of all spawned cargos and health(unless they dissappear when dead), send over alive or dead cargo positions to distance comparison
			b. nodeJS build initial map of units
				1. build lat,lon distance calculator(make this VERY fast)
				1. spawn farp support units function, fires off when someone captures base, cargo plane comes in to bring these units, map units to base name
				2. spawn random populated base units, fires off again when someone captures base on timer with cargo plane coming in to replenish, map units to base name
				3. spawn static cmd centers for CTLD functions, map buildings to base name, respawn when base captured, and cargo repair plane makes it, scheduler to keep trying to repair until done
				4. CTLD like menu option, add and remove options based on distance calculations
				5. build CTLD menu spawner
				6. Strike building to stop spwning at that airport, its invicible until 90% ?? of units dead, replenished by AI c17 support
				7. work on menu enabled point spenders to call in fun things

		2. questions
			a. warehouses supplying trickle of hard to get weapons, 120's nukes, cbu97s, bk90s
			every base has a strike warehouse linked to it for these hard to get weapons, strike warehouse does not come back until restart


	*/

	/*
		side lua addon:
			build static updator for static buildings - ctld buildings, supply and demand

		1. On Connection:
			a. if server unit database (after initial pull) is less than 100 units, run this function
			b. on dynamic dcs disconnects and reconnects, if over 100 units, pull a fresh replacement to the dynamic dcs data, do NOT run this function
			c. if 1 side owns ALL of the farps and bases of the map, give all people responsible (and not a traitor), a good helping of points to spend on next run.
			d. setup backend flags on which slot can be occupied and not, prob switch this to simple lua local table, for lua to use

		2. build map
			a. build farp support
			b. build defenses
			c. build ctld statics - map who owns them by name

		3. nodeJS runtime loop
			a. every player and moving AI (determined by name)) distance detector,
				1. run through conditions depending on distance, ctld crates, troop pickup, base capture
				2. ctld pickup locations and ctld crates for deployment and distance from main base
				3. write a common lat, long distance calculator
				4. write a runtime loop updator for player f10 options based on conditions, spending points, bases(location currently)

		4. Misc
			a. JTAC script, distance checker between line of sight items, lase and smoke/illuminate at night (user laser code determined by setting on website settings, must have account)
			b. think about supply and demand system, warehouses that supply items to a base, spawn in moving units to signify those supplys, can be destroyed in transit
			c. special f10 options to use points on, strikes, escort CAP fighter or atk heli, extremely rare and expensive arms, 120's r77 27et etc
			d. pickup down pilots for points (can be virtual, they get near reported point, spawn unit and smoke)
			e. forward operating base to run like CTLD command center, same rules as ctld




	 */

});
