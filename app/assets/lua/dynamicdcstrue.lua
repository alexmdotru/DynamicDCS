clientEventHandler = {}

function tprint(tbl, indent)
	if not indent then indent = 0 end
	for k, v in pairs(tbl) do
		formatting = string.rep("  ", indent) .. k .. ": "
		if type(v) == "table" then
			env.info(formatting)
			tprint(v, indent + 1)
		elseif type(v) == 'boolean' then
			env.info(formatting .. tostring(v))
		else
			env.info(formatting .. tostring(v))
		end
	end
end

function string:split(inSplitPattern, outResults)
	if not outResults then
		outResults = {}
	end
	local theStart = 1
	local theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
	while theSplitStart do
		table.insert(outResults, string.sub(self, theStart, theSplitStart - 1))
		theStart = theSplitEnd + 1
		theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
	end
	table.insert(outResults, string.sub(self, theStart))
	return outResults
end

local CategoryNames = {
	[Unit.Category.AIRPLANE] = "AIRPLANE",
	[Unit.Category.HELICOPTER] = "HELICOPTER",
	[Unit.Category.GROUND_UNIT] = "GROUND",
	[Unit.Category.SHIP] = "SHIP",
	[Unit.Category.STRUCTURE] = "STRUCTURE"
}

local CountryNames = {
	[0] = "RUSSIA",
	[1] = "UKRAINE",
	[2] = "USA",
	[3] = "TURKEY",
	[4] = "UK",
	[5] = "FRANCE",
	[6] = "GERMANY",
	[7] = "AGGRESSORS",
	[8] = "CANADA",
	[9] = "SPAIN",
	[10] = "THE_NETHERLANDS",
	[11] = "BELGIUM",
	[12] = "NORWAY",
	[13] = "DENMARK",
	[14] = "SECRET",
	[15] = "ISRAEL",
	[16] = "GEORGIA",
	[17] = "INSURGENTS",
	[18] = "ABKHAZIA",
	[19] = "SOUTH_OSETIA",
	[20] = "ITALY",
	[21] = "AUSTRALIA",
	[22] = "SWITZERLAND",
	[23] = "AUSTRIA",
	[24] = "BELARUS",
	[25] = "BULGARIA",
	[26] = "CHEZH_REPUBLIC",
	[27] = "CHINA",
	[28] = "CROATIA",
	[29] = "EGYPT",
	[30] = "FINLAND",
	[31] = "GREECE",
	[32] = "HUNGARY",
	[33] = "INDIA",
	[34] = "IRAN",
	[35] = "IRAQ",
	[36] = "JAPAN",
	[37] = "KAZAKHSTAN",
	[38] = "NORTH_KOREA",
	[39] = "PAKISTAN",
	[40] = "POLAND",
	[41] = "ROMANIA",
	[42] = "SAUDI_ARABIA",
	[43] = "SERBIA",
	[44] = "SLOVAKIA",
	[45] = "SOUTH_KOREA",
	[46] = "SWEDEN",
	[47] = "SYRIA",
	[48] = "YEMEN",
	[49] = "VIETNAM",
	[51] = "TUNISIA",
	[52] = "THAILAND",
	[53] = "SUDAN",
	[54] = "PHILIPPINES",
	[55] = "MOROCCO",
	[56] = "MEXICO",
	[57] = "MALAYSIA",
	[58] = "LIBYA",
	[59] = "JORDAN",
	[60] = "INDONESIA",
	[61] = "HONDURAS",
	[62] = "ETHIOPIA",
	[63] = "CHILE",
	[64] = "BRAZIL",
	[65] = "BAHRAIN",
	[66] = "THIRDREICH",
	[67] = "YUGOSLAVIA",
	[68] = "USSR",
	[69] = "ITALIAN_SOCIAL_REPUBLIC"
}

do
	--
	local PORT = 3001
	local DATA_TIMEOUT_SEC = 0.5

	local isResetUnits = false
	local lockBaseUpdates = true
	local unitCache = {}
	local airbaseCache = {}
	local staticCache = {}
	local updateQue = { ["que"] = {} }

	local unitCnt = 0
	local checkUnitDead = {}
	local staticCnt = 0
	local checkStaticDead = {}

	package.path = package.path .. ";.\\LuaSocket\\?.lua"
	package.cpath = package.cpath .. ";.\\LuaSocket\\?.dll"

	--in missionScripting.lua file: dynamicDCS = { require = require }
	require = dynamicDCS.require
	local socket = require("socket")
	local JSON = loadfile("Scripts\\JSON.lua")()
	require = nil
	local missionStartTime = os.time()
	local airbases = {}

	local function log(msg)
		env.info("DynamicDCS (t=" .. timer.getTime() .. "): " .. msg)
	end

	log('REALTIME ' .. missionStartTime)

	local function getAllDefzone ()
		local polyArray = {}
		polyArray.count = 0
		if env.mission.coalition then
			for coa,coaTable in pairs(env.mission.coalition) do
				if type(coaTable) == 'table' and coaTable.country and coa == 'blue' then
					for i=1,#coaTable.country do
						local country = coaTable.country[i]
						for uType,uTable in pairs(country) do
							if uType == 'helicopter' then
								if type(uTable)=='table' and uTable.group then
									for j=1,#uTable.group do
										local group = uTable.group[j]
										local gName = env.getValueDictByKey(group.name)
										if gName and group.route.points and string.find(gName, '_DEFZONE_', 1, true) then
											local nArry = gName:split("_DEFZONE_")
											polyArray[nArry[2]] = {}
											airbaseCache[nArry[2]] = {}
											airbaseCache[nArry[2]].side = 0
											polyArray.count = polyArray.count + 1
											for pIndex = 1, #group.route.points do
												local lat, lon, alt = coord.LOtoLL({x = group.route.points[pIndex].x, y = 0, z = group.route.points[pIndex].y})
												polyArray[nArry[2]][pIndex] = {
													[1] = lon,
													[2] = lat
												}
											end
										end
									end
								end
							end
						end
					end
				end
			end
		end
		return polyArray
	end

	local polyArray = getAllDefzone()

	local function updateAirbases(airbases, coalition)
		local airbaseObj = {}
		for airbaseIndex = 1, #airbases do
			local baseId = tonumber(airbases[airbaseIndex]:getID())
			local unitPosition = airbases[airbaseIndex]:getPosition()
			local x = unitPosition.p.x
			local y = unitPosition.p.z
			local lat, lon, alt = coord.LOtoLL(unitPosition.p)
			local unitXYZNorthCorr = coord.LLtoLO(lat + 1, lon)
			local headingNorthCorr = math.atan2(unitXYZNorthCorr.z - unitPosition.p.z, unitXYZNorthCorr.x - unitPosition.p.x)
			local heading = math.atan2(unitPosition.x.z, unitPosition.x.x) + headingNorthCorr
			if heading < 0 then
				heading = heading + 2 * math.pi
			end
			local hdg = math.floor(heading / math.pi * 180);
			local baseName = airbases[airbaseIndex]:getName()
			local country = CountryNames[airbases[airbaseIndex]:getCountry()]
			local curObj = {
				["_id"] = baseName,
				["baseId"] = baseId,
				["name"] = baseName,
				["country"] = country,
				["hdg"] = hdg,
				["side"] = coalition,
				["centerLoc"] = {
					lon,
					lat
				},
				["polygonLoc"] = {},
				["alt"] = alt,
				["farp"] = false,
				["expansion"] = false,
				["mainBase"] = false
			}
			if string.find(baseName, 'FARP', 1, true) then
				curObj.farp = true
			end
			if string.find(baseName, 'Expansion', 1, true) then
				curObj.expansion = true
			end
			if not string.find(baseName, 'Expansion', 1, true) and not string.find(baseName, ' #', 1, true) then
				env.info('applycache  ' .. baseName..' : '.. coalition);
				trigger.action.setUserFlag(baseName, coalition)
				curObj.mainBase = true
				airbaseCache[baseName].side = coalition
				curObj["polygonLoc"] = polyArray[baseName]
			end
			table.insert(updateQue.que, {
				polyCnt = polyArray.count,
				action = 'airbaseC',
				data = curObj
			})
		end
	end

	local function initAirbases()
		local neutralAirbases = coalition.getAirbases(coalition.side.NEUTRAL)
		if neutralAirbases ~= nil then
			updateAirbases(neutralAirbases, 0)
		end
		local redAirbases = coalition.getAirbases(coalition.side.RED)
		if redAirbases ~= nil then
			updateAirbases(redAirbases, 1)
		end
		local blueAirbases = coalition.getAirbases(coalition.side.BLUE)
		if blueAirbases ~= nil then
			updateAirbases(blueAirbases, 2)
		end
	end

	local function addGroups(groups, coalition, Init)
		for groupIndex = 1, #groups do
			local group = groups[groupIndex]
			local units = group:getUnits()
			for unitIndex = 1, #units do
				local unit = units[unitIndex]
				if Unit.isActive(unit) then
					local curUnit = {
						uType = "unit",
						data = {}
					}
					curUnit.data.unitId = tonumber(unit:getID())
					curUnit.data.life = tonumber(unit:getLife())
					local unitPosition = unit:getPosition()
					local lat, lon, alt = coord.LOtoLL(unitPosition.p)
					curUnit.data.lonLatLoc = {
						lon,
						lat
					}
					curUnit.data.alt = alt
					local unitXYZNorthCorr = coord.LLtoLO(lat + 1, lon)
					local headingNorthCorr = math.atan2(unitXYZNorthCorr.z - unitPosition.p.z, unitXYZNorthCorr.x - unitPosition.p.x)
					local heading = math.atan2(unitPosition.x.z, unitPosition.x.x) + headingNorthCorr
					if heading < 0 then
						heading = heading + 2 * math.pi
					end
					curUnit.data.hdg = math.floor(heading / math.pi * 180);
					local velocity = unit:getVelocity()
					if (velocity) then
						curUnit.data.speed = math.sqrt(velocity.x ^ 2 + velocity.z ^ 2)
					end
					if unitCache[curUnit.data.unitId] ~= nil and not Init then
						if unitCache[curUnit.data.unitId].lat ~= lat or unitCache[curUnit.data.unitId].lon ~= lon then
							unitCache[curUnit.data.unitId] = {}
							unitCache[curUnit.data.unitId].lat = lat
							unitCache[curUnit.data.unitId].lon = lon
							curUnit.action = "U"
							table.insert(updateQue.que, curUnit)
						end
					else
						unitCache[curUnit.data.unitId] = {}
						unitCache[curUnit.data.unitId].lat = lat
						unitCache[curUnit.data.unitId].lon = lon
						local maxLife = unit:getLife0()
						if maxLife ~= nil then
							curUnit.data.maxLife = tonumber(maxLife)
						end
						curUnit.data.groupId = group:getID()
						curUnit.data.groupName = group:getName()
						curUnit.data.name = unit:getName()
						curUnit.data.category = CategoryNames[unit:getDesc().category]
						curUnit.data.type = unit:getTypeName()
						curUnit.data.coalition = coalition
						curUnit.data.country = CountryNames[unit:getCountry()]
						local PlayerName = unit:getPlayerName()
						if PlayerName ~= nil then
							curUnit.data.playername = PlayerName
						else
							curUnit.data.playername = ""
						end
						curUnit.action = "C"
						table.insert(updateQue.que, curUnit)
					end
					checkUnitDead[curUnit.data.unitId] = 1
				end
			end
		end
	end

	local function updateGroups(Init)
		unitCnt = 0
		checkUnitDead = {}
		local redGroups = coalition.getGroups(coalition.side.RED)
		if redGroups ~= nil then
			addGroups(redGroups, 1, Init)
		end
		local blueGroups = coalition.getGroups(coalition.side.BLUE)
		if blueGroups ~= nil then
			addGroups(blueGroups, 2, Init)
		end
		--check dead, send delete action to server if dead detected
		for k, v in pairs(unitCache) do
			if checkUnitDead[k] == nil then
				local curUnit = {
					action = "D",
					uType = "unit",
					data = {
						unitId = k
					}
				}
				table.insert(updateQue.que, curUnit)
				unitCache[k] = nil
			end
			unitCnt = unitCnt + 1
		end
	end

	local function addStatics(statics, coalition, Init)
		for staticIndex = 1, #statics do
			local static = statics[staticIndex]
			if static ~= 1 then
				local curStatic = {
					uType = "static",
					data = {}
				}
				curStatic.data.unitId = tonumber(static:getID())
				curStatic.data.life = static:getLife()
				local staticPosition = static:getPosition()
				curStatic.data.lat, curStatic.data.lon, curStatic.data.alt = coord.LOtoLL(staticPosition.p)
				local unitPosition = unit:getPosition()
				local lat, lon, alt = coord.LOtoLL(staticPosition.p)
				curStatic.data.lonLatLoc = {
					lon,
					lat
				}
				curStatic.data.alt = alt
				local unitXYZNorthCorr = coord.LLtoLO(lat + 1, lon)
				local unitXYZNorthCorr = coord.LLtoLO(curStatic.data.lat + 1, curStatic.data.lon)
				local headingNorthCorr = math.atan2(unitXYZNorthCorr.z - staticPosition.p.z, unitXYZNorthCorr.x - staticPosition.p.x)
				local heading = math.atan2(staticPosition.x.z, staticPosition.x.x) + headingNorthCorr
				if heading < 0 then
					heading = heading + 2 * math.pi
				end
				curStatic.data.hdg = math.floor(heading / math.pi * 180);
				if staticCache[curStatic.data.unitId] ~= nil and not Init then
					if staticCache[curStatic.data.unitId].lat ~= lat or staticCache[curStatic.data.unitId].lon ~= lon then
						staticCache[curStatic.data.unitId] = {}
						staticCache[curStatic.data.unitId].lat = lat
						staticCache[curStatic.data.unitId].lon = lon
						curStatic.action = "U"
						table.insert(updateQue.que, curStatic)
					end
				else
					staticCache[curStatic.data.unitId] = {}
					staticCache[curStatic.data.unitId].lat = lat
					staticCache[curStatic.data.unitId].lon = lon
					curStatic.data.name = static:getName()
					curStatic.data.maxLife = tonumber(static:getLife())
					curStatic.data.category = CategoryNames[static:getDesc().category]
					curStatic.data.type = static:getTypeName()
					curStatic.data.coalition = coalition
					curStatic.action = "C"
					table.insert(updateQue.que, curStatic)
				end
				checkStaticDead[curStatic.data.unitId] = 1
			end
		end
	end

	local function updateStatics(Init)
		staticCnt = 0
		checkStaticDead = {}
		local redStatics = coalition.getStaticObjects(coalition.side.RED)
		if redStatics ~= nil then
			addStatics(redStatics, 1, Init)
		end
		local blueStatics = coalition.getStaticObjects(coalition.side.BLUE)
		if blueStatics ~= nil then
			addStatics(blueStatics, 2, Init)
		end
		for k, v in pairs(staticCache) do
			if checkStaticDead[k] == nil then
				local curStatic = {
					action = "D",
					uType = "static",
					data = {
						staticId = k
					}
				}
				table.insert(updateQue.que, curStatic)
				staticCache[k] = nil
			end
			staticCnt = staticCnt + 1
		end
	end

	local function getDataMessage()
		-- check for base take
		local neutralAirbases = coalition.getAirbases(coalition.side.NEUTRAL)
		if neutralAirbases ~= nil then
			for naIndex = 1, #neutralAirbases do
				local baseName = neutralAirbases[naIndex]:getName()
				if airbaseCache[baseName] ~= nil and not string.find(baseName, 'Expansion', 1, true) and not string.find(baseName, ' #', 1, true) then
					--env.info('FL: '..baseName..' : '..0)
					trigger.action.setUserFlag(baseName, 0)
					airbaseCache[baseName].side = 0
				end
			end
		end
		local redAirbases = coalition.getAirbases(coalition.side.RED)
		if redAirbases ~= nil then
			for rIndex = 1, #redAirbases do
				local baseName = redAirbases[rIndex]:getName()
				if airbaseCache[baseName] ~= nil and not string.find(baseName, 'Expansion', 1, true) and not string.find(baseName, ' #', 1, true) then
					--env.info('FL: '..baseName..' : '..1)
					trigger.action.setUserFlag(baseName, 1)
					airbaseCache[baseName].side = 1
				end
			end
		end
		local blueAirbases = coalition.getAirbases(coalition.side.BLUE)
		if blueAirbases ~= nil then
			for bIndex = 1, #blueAirbases do
				local baseName = blueAirbases[bIndex]:getName()
				if airbaseCache[baseName] ~= nil and not string.find(baseName, 'Expansion', 1, true) and not string.find(baseName, ' #', 1, true) then
					--env.info('FL: '..baseName..' : '..2)
					trigger.action.setUserFlag(baseName, 2)
					airbaseCache[baseName].side = 2
				end
			end
		end

		table.insert(updateQue.que, {
			action = 'airbaseU',
			data = airbaseCache
		})

		updateGroups()

		updateStatics()

		local chkSize = 500
		local payload = {}
		payload.que = {}
		for i = 1, chkSize do
			table.insert(payload.que, updateQue.que[i])
			table.remove(updateQue.que, i)
		end
		payload.polyCnt = polyArray.count
		payload.unitCount = unitCnt + staticCnt
		payload.startAbsTime = timer.getTime0()
		payload.curAbsTime = timer.getAbsTime()
		payload.epoc = missionStartTime * 1000
		return payload
	end

	local function runRequest(request)
		if request.action ~= nil then
			if request.action == "GETPOLYDEF" then
				initAirbases()
			end
			if request.action == "INIT" then
				--send all unit updates
				initAirbases()
				updateGroups(true)
				updateStatics(true)
			end
			if request.action == "CMD" and request.cmd ~= nil and request.reqID ~= nil then
				log('RUNNING CMD: '.. request.cmd)
				pcallCommand(request.cmd, request.reqID)
			end
		end
	end

	log("Starting DCS unit data server")

	local tcp = socket.tcp()
	tcp:settimeout(0)
	local bound, error = tcp:bind('*', PORT)
	if not bound then
		log("Could not bind: " .. error)
		return
	end
	log("Port " .. PORT .. " bound")

	local serverStarted, error = tcp:listen(1)
	if not serverStarted then
		log("Could not start server: " .. error)
		return
	end
	log("Server started")

	local function checkJSON(jsonstring, code)
		if code == 'encode' then
			if type(JSON:encode(jsonstring)) ~= "string" then
				error("encode expects a string after function")
			end
		end
		if code == 'decode' then
			if type(jsonstring) ~= "string" then
				error("decode expects string")
			end
		end
	end

	local client
	local function step()
		if not client then
			client = tcp:accept()
			tcp:settimeout(0)

			if client then
				log("Connection established")
				--send all unit updates
				updateGroups(true)
				updateStatics(true)
			end
		end

		if client then
			local line, err = client:receive('*l')
			if line ~= nil then
				--log(line)
				local success, error = pcall(checkJSON, line, 'decode')
				if success then
					local incMsg = JSON:decode(line)
					runRequest(incMsg);
				else
					log("Error: " .. error)
				end
			end
			-- if there was no error, send it back to the client
			if not err then
				local dataPayload = getDataMessage()
				local success, error = pcall(checkJSON, dataPayload, 'encode')
				if success then
					local outMsg = JSON:encode(dataPayload)
					local bytes, status, lastbyte = client:send(outMsg .. "\n")
					if not bytes then
						log("Connection lost")
						client = nil
					end;
				else
					log("Error: " .. error)
				end
			else
				log("Connection lost")
				client = nil
			end
		end
	end

	timer.scheduleFunction(function(arg, time)
		local success, error = pcall(step)
		if not success then
			log("Error: " .. error)
		end
		return timer.getTime() + DATA_TIMEOUT_SEC
	end, nil, timer.getTime() + DATA_TIMEOUT_SEC)

	--Protected call to command execute
	function pcallCommand(s, respId)
		local success, resp = pcall(commandExecute, s)
		if success then
			if resp ~= nil then
				local curUpdate;
				curUpdate = {
					action = 'CMDRESPONSE',
					data = {
						respId = respId,
						cmd = s,
						response = resp
					}
				}
				table.insert(updateQue.que, curUpdate)
			end
		else
			log("Error: " .. resp)
		end
	end

	function commandExecute(s)
		return loadstring("return " .. s)()
	end

	--Send Mission Events Back
	local eventTypes = {
		[0] = "S_EVENT_INVALID",
		[1] = "S_EVENT_SHOT",
		[2] = "S_EVENT_HIT",
		[3] = "S_EVENT_TAKEOFF",
		[4] = "S_EVENT_LAND",
		[5] = "S_EVENT_CRASH",
		[6] = "S_EVENT_EJECTION",
		[7] = "S_EVENT_REFUELING",
		[8] = "S_EVENT_DEAD",
		[9] = "S_EVENT_PILOT_DEAD",
		[10] = "S_EVENT_BASE_CAPTURED",
		[11] = "S_EVENT_MISSION_START",
		[12] = "S_EVENT_MISSION_END",
		[13] = "S_EVENT_TOOK_CONTROL",
		[14] = "S_EVENT_REFUELING_STOP",
		[15] = "S_EVENT_BIRTH",
		[16] = "S_EVENT_HUMAN_FAILURE",
		[17] = "S_EVENT_ENGINE_STARTUP",
		[18] = "S_EVENT_ENGINE_SHUTDOWN",
		[19] = "S_EVENT_PLAYER_ENTER_UNIT",
		[20] = "S_EVENT_PLAYER_LEAVE_UNIT",
		[21] = "S_EVENT_PLAYER_COMMENT",
		[22] = "S_EVENT_SHOOTING_START",
		[23] = "S_EVENT_SHOOTING_END",
		[24] = "S_EVENT_MAX"
	}
	local birthTypes = {
		"wsBirthPlace_Air",
		"wsBirthPlace_RunWay",
		"wsBirthPlace_Park",
		"wsBirthPlace_Heliport_Hot",
		"wsBirthPlace_Heliport_Cold"
	}

	local weaponCategory = {
		"SHELL",
		"MISSILE",
		"ROCKET",
		"BOMB"
	}


	function clientEventHandler:onEvent(_event)
		local status, err = pcall(function(_event)
			if _event == nil or _event.initiator == nil then
				return false
			else
				local curEvent = {}
				if _event.id ~= nil then
					curEvent.name = eventTypes[_event.id]
					curEvent.arg1 = _event.id
				end
				if _event.time ~= nil then
					curEvent.arg2 = _event.time
				end
				if _event.initiator ~= nil then
					curEvent.arg3 = tonumber(_event.initiator:getID())
				end
				if _event.target ~= nil then
					curEvent.arg4 = tonumber(_event.target:getID())
				end
				if _event.place ~= nil then
					curEvent.arg5 = _event.place:getName()
				end
				if _event.subPlace ~= nil then
					curEvent.arg6 = birthTypes[_event.subPlace]
				end
				if _event.weapon ~= nil then
					local curWeapon = _event.weapon:getDesc()
					curEvent.arg7 = {
						["typeName"] = curWeapon.typeName,
						["displayName"] = curWeapon.displayName,
						["category"] = weaponCategory[curWeapon.category + 1]
					}
				end
				table.insert(updateQue.que, {
					action = eventTypes[_event.id],
					data = curEvent
				})
				return true
			end
		end, _event)
		if (not status) then
			env.info(string.format("Error while handling event %s", err), false)
		end
	end

	local function f10MenuCmd (cmdObj)
		env.info('f10 cmd: '..cmdObj[1]..' groupId: '..cmdObj[2]..' unitId: '..cmdObj[3]..' side: '..cmdObj[4])
	end

	local function buildLogisticsMenu (buildObj)
		missionCommands.addSubMenuForGroup(buildObj[1], "Logistics")
			missionCommands.addSubMenuForGroup(buildObj[1], "Troops", {"Logistics"})
				missionCommands.addCommandForGroup(buildObj[1], "Unload / Extract Troops", {"Logistics", "Troops"}, f10MenuCmd, {'unloadExtractTroops', buildObj[1], buildObj[2], buildObj[3]})
				missionCommands.addCommandForGroup(buildObj[1], "Check Cargo", {"Logistics", "Troops"}, f10MenuCmd, {'checkCargo', buildObj[1], buildObj[2], buildObj[3]})
				missionCommands.addCommandForGroup(buildObj[1], "Load Infantry", {"Logistics", "Troops"}, f10MenuCmd, {'loadInfantry', buildObj[1], buildObj[2], buildObj[3]})
				missionCommands.addCommandForGroup(buildObj[1], "Load RPG Team", {"Logistics", "Troops"}, f10MenuCmd, {'loadRPG', buildObj[1], buildObj[2], buildObj[3]})
				missionCommands.addCommandForGroup(buildObj[1], "Load Mortar Team", {"Logistics", "Troops"}, f10MenuCmd, {'loadMortarTeam', buildObj[1], buildObj[2], buildObj[3]})
	end

	local function clearMenu (clearObj)
		missionCommands.removeItemForGroup(clearObj[1], clearObj[2])
	end

	local function f10Setup (_groupId, _unitId, side)
		missionCommands.addSubMenuForGroup(_groupId, "Offense")
		missionCommands.addSubMenuForGroup(_groupId, "Defense")
		missionCommands.addSubMenuForGroup(_groupId, "Test")
			missionCommands.addCommandForGroup(_groupId, "Fill Troop Menu", {"Test"}, buildLogisticsMenu, {_groupId, _unitId, side})
			missionCommands.addCommandForGroup(_groupId, "Clear Troop Menu", {"Test"}, clearMenu, {_groupId, {"Logistics"}})
	end

	local function setupF10Menus ()
		local redGroups = coalition.getGroups(coalition.side.RED)
		if redGroups ~= nil then
			for groupIndex = 1, #redGroups do
				local group = redGroups[groupIndex]
				local _groupId = group:getID()
				local units = group:getUnits()
				local _unitId = tonumber(units[1]:getID())
			 	f10Setup (_groupId, _unitId, 1)
			end
		end
		local blueGroups = coalition.getGroups(coalition.side.BLUE)
		if blueGroups ~= nil then
			for groupIndex = 1, #blueGroups do
				local group = blueGroups[groupIndex]
				local _groupId = group:getID()
				local units = group:getUnits()
				local _unitId = tonumber(units[1]:getID())
				f10Setup (_groupId, _unitId, 2)
			end
		end
	end

	setupF10Menus()

end

--local _refreshPath = missionCommands.addSubMenu("Refresh")
--missionCommands.addCommand("Refresh Menus", _refreshPath, function (sayIt) env.info('si: '..sayIt) end, 'send refresh menu')

world.addEventHandler(clientEventHandler)
env.info("dynamicDCSTrue event handler added")
