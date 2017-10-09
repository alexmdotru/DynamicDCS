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

	local function captureAirbase(baseID, coalition, farp)
		env.info('base update ' .. baseID .. ' - ' .. coalition)
		table.insert(updateQue.que, {
			action = 'airbaseU',
			data = {
				["baseID"] = baseID,
				["side"] = coalition,
				["farp"] = farp
			}
		})
	end

	local function updateAirbases(airbases, coalition)
		local airbaseObj = {}
		for airbaseIndex = 1, #airbases do
			local baseID = tonumber(airbases[airbaseIndex]:getID())
			local unitPosition = airbases[airbaseIndex]:getPosition()
			lat, lon, alt = coord.LOtoLL(unitPosition.p)
			local baseName = airbases[airbaseIndex]:getName()
			local curObj = {
				["_id"] = baseName,
				["baseID"] = baseID,
				["name"] = baseName,
				["side"] = coalition,
				["lat"] = lat,
				["lon"] = lon,
				["alt"] = alt,
				["farp"] = false
			}
			if string.find(baseName, 'FARP', 1, true) then
				curObj.farp = true
			end
			if not string.find(baseName, 'Expansion', 1, true) and not string.find(baseName, ' #', 1, true) then
				env.info('applycache  ' .. baseID);
				airbaseCache[baseID] = curObj
				table.insert(updateQue.que, {
					action = 'airbaseC',
					data = curObj
				})
			end
		end
	end

	local function clearVar()
		if not lockBaseUpdates then
			env.info('Clearing Vars')
			isResetUnits = true
			unitCache = {}
			airbaseCache = {}
			staticCache = {}
			updateQue = { ["que"] = {} }

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
			isResetUnits = false
		end
	end

	local function getDataMessage()

		-- check for base take
		if not isResetUnits then
			local neutralAirbases = coalition.getAirbases(coalition.side.NEUTRAL)
			if neutralAirbases ~= nil then
				for naIndex = 1, #neutralAirbases do
					local baseID = tonumber(neutralAirbases[naIndex]:getID())
					if airbaseCache[baseID] ~= nil then
						if airbaseCache[baseID].side ~= 0 and not airbaseCache[baseID].expansion then
							airbaseCache[baseID].side = 0
							captureAirbase(baseID, 0, airbaseCache[baseID].farp);
						end
					end
				end
			end
			local redAirbases = coalition.getAirbases(coalition.side.RED)
			if redAirbases ~= nil then
				for rIndex = 1, #redAirbases do
					local baseID = tonumber(redAirbases[rIndex]:getID())
					if airbaseCache[baseID] ~= nil then
						if airbaseCache[baseID].side ~= 1 and not airbaseCache[baseID].expansion then
							airbaseCache[baseID].side = 1
							captureAirbase(baseID, 1, airbaseCache[baseID].farp);
						end
					end
				end
			end
			local blueAirbases = coalition.getAirbases(coalition.side.BLUE)
			if blueAirbases ~= nil then
				for bIndex = 1, #blueAirbases do
					local baseID = tonumber(blueAirbases[bIndex]:getID())
					if airbaseCache[baseID] ~= nil then
						if airbaseCache[baseID].side ~= 2 and not airbaseCache[baseID].expansion then
							airbaseCache[baseID].side = 2
							captureAirbase(baseID, 2, airbaseCache[baseID].farp);
						end
					end
				end
			end

			local checkUnitDead = {}
			local checkStaticDead = {}

			local CategoryNames = {
				[Unit.Category.AIRPLANE] = "Airplane",
				[Unit.Category.HELICOPTER] = "Helicopter",
				[Unit.Category.GROUND_UNIT] = "Ground Unit",
				[Unit.Category.SHIP] = "Ship",
				[Unit.Category.STRUCTURE] = "Structure",
			}

			local function addGroups(groups, coalition)
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
							curUnit.data.unitID = tonumber(unit:getID())
							curUnit.data.life = tonumber(unit:getLife())
							local unitPosition = unit:getPosition()
							curUnit.data.lat, curUnit.data.lon, curUnit.data.alt = coord.LOtoLL(unitPosition.p)
							local unitXYZNorthCorr = coord.LLtoLO(curUnit.data.lat + 1, curUnit.data.lon)
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
							if unitCache[curUnit.data.unitID] ~= nil then
								if unitCache[curUnit.data.unitID].lat ~= curUnit.data.lat or unitCache[curUnit.data.unitID].lon ~= curUnit.data.lon then
									unitCache[curUnit.data.unitID] = {}
									unitCache[curUnit.data.unitID].lat = curUnit.data.lat
									unitCache[curUnit.data.unitID].lon = curUnit.data.lon
									curUnit.action = "U"
									table.insert(updateQue.que, curUnit)
								end
							else
								unitCache[curUnit.data.unitID] = {}
								unitCache[curUnit.data.unitID].lat = curUnit.data.lat
								unitCache[curUnit.data.unitID].lon = curUnit.data.lon
								local maxLife = unit:getLife0()
								if maxLife ~= nil then
									curUnit.data.maxLife = tonumber(maxLife)
								end
								curUnit.data.name = unit:getName()
								curUnit.data.category = CategoryNames[unit:getDesc().category]
								curUnit.data.type = unit:getTypeName()
								curUnit.data.coalition = coalition
								local PlayerName = unit:getPlayerName()
								if PlayerName ~= nil then
									curUnit.data.playername = PlayerName
								else
									curUnit.data.playername = ""
								end
								curUnit.action = "C"
								table.insert(updateQue.que, curUnit)
							end
							checkUnitDead[curUnit.data.unitID] = 1
						end
					end
				end
			end

			local redGroups = coalition.getGroups(coalition.side.RED)
			if redGroups ~= nil then
				addGroups(redGroups, 1)
			end
			local blueGroups = coalition.getGroups(coalition.side.BLUE)
			if blueGroups ~= nil then
				addGroups(blueGroups, 2)
			end

			--check dead, send delete action to server if dead detected
			local unitCnt = 0
			for k, v in pairs(unitCache) do
				if checkUnitDead[k] == nil then
					local curUnit = {
						action = "D",
						uType = "unit",
						data = {
							unitID = k
						}
					}
					table.insert(updateQue.que, curUnit)
					unitCache[k] = nil
				end
				unitCnt = unitCnt + 1
			end

			local function addStatics(statics, coalition)
				for staticIndex = 1, #statics do
					local static = statics[staticIndex]
					if static ~= 1 then
						local curStatic = {
							uType = "static",
							data = {}
						}
						curStatic.data.unitID = tonumber(static:getID())
						curStatic.data.life = static:getLife()
						local staticPosition = static:getPosition()
						curStatic.data.lat, curStatic.data.lon, curStatic.data.alt = coord.LOtoLL(staticPosition.p)
						local unitXYZNorthCorr = coord.LLtoLO(curStatic.data.lat + 1, curStatic.data.lon)
						local headingNorthCorr = math.atan2(unitXYZNorthCorr.z - staticPosition.p.z, unitXYZNorthCorr.x - staticPosition.p.x)
						local heading = math.atan2(staticPosition.x.z, staticPosition.x.x) + headingNorthCorr
						if heading < 0 then
							heading = heading + 2 * math.pi
						end
						curStatic.data.hdg = math.floor(heading / math.pi * 180);
						if staticCache[curStatic.data.unitID] ~= nil then
							if staticCache[curStatic.data.unitID].lat ~= curStatic.data.lat or staticCache[curStatic.data.unitID].lon ~= curStatic.data.lon then
								staticCache[curStatic.data.unitID] = {}
								staticCache[curStatic.data.unitID].lat = curStatic.data.lat
								staticCache[curStatic.data.unitID].lon = curStatic.data.lon
								curStatic.action = "U"
								table.insert(updateQue.que, curStatic)
							end
						else
							staticCache[curStatic.data.unitID] = {}
							staticCache[curStatic.data.unitID].lat = curStatic.data.lat
							staticCache[curStatic.data.unitID].lon = curStatic.data.lon
							curStatic.data.name = static:getName()
							curStatic.data.maxLife = tonumber(static:getLife())
							curStatic.data.category = CategoryNames[static:getDesc().category]
							curStatic.data.type = static:getTypeName()
							curStatic.data.coalition = coalition
							curStatic.action = "C"
							table.insert(updateQue.que, curStatic)
						end
						checkStaticDead[curStatic.data.unitID] = 1
					end
				end
			end

			local redStatics = coalition.getStaticObjects(coalition.side.RED)
			if redStatics ~= nil then
				addStatics(redStatics, 1)
			end
			local blueStatics = coalition.getStaticObjects(coalition.side.BLUE)
			if blueStatics ~= nil then
				addStatics(blueStatics, 2)
			end

			local staticCnt = 0
			for k, v in pairs(staticCache) do
				if checkStaticDead[k] == nil then
					local curStatic = {
						action = "D",
						uType = "static",
						data = {
							staticID = k
						}
					}
					table.insert(updateQue.que, curStatic)
					staticCache[k] = nil
				end
				staticCnt = staticCnt + 1
			end

			local chkSize = 500
			local payload = {}
			payload.que = {}
			for i = 1, chkSize do
				table.insert(payload.que, updateQue.que[i])
				table.remove(updateQue.que, i)
			end
			payload.unitCount = unitCnt + staticCnt
			payload.startAbsTime = timer.getTime0()
			payload.curAbsTime = timer.getAbsTime()
			payload.epoc = missionStartTime * 1000
			return payload
		end
	end

	local function runRequest(request)
		if request.action ~= nil then
			if request.action == "INIT" then
				-- log('RUNNING REQUEST INIT')
				env.info('INIT '..table.getn(airbaseCache))
				if table.getn(airbaseCache) == 0 then
					-- call initial pop, disable clear var while init pop runs
					env.info('INITIAL PULL FROM DB TO POPULATE MAP');
				else
					lockBaseUpdates = false
					clearVar();
				end

			end
			if request.action == "CMD" and request.cmd ~= nil and request.reqID ~= nil then
				-- log('RUNNING CMD')
				pcallCommand(request.cmd, request.reqID)
			end
		end
	end

	log("Starting DCS unit data server")

	local tcp = socket.tcp()
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
			tcp:settimeout(0.001)
			client = tcp:accept()

			if client then
				tcp:settimeout(0.001)
				log("Connection established")
				clearVar()
			end
		end

		if client then
			local line, err = client:receive()
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
	function pcallCommand(s, respID)
		local success, resp = pcall(commandExecute, s)
		if success then
			if resp ~= nil then
				local curUpdate;
				curUpdate = {
					action = 'CMDRESPONSE',
					data = {
						respID = respID,
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
end

world.addEventHandler(clientEventHandler)
env.info("dynamicDCSTrue event handler added")
