clientEventHandler = {}

--in missionScripting.lua file: dynamicDCS = { require = require }
function tprint(tbl, indent)
	if not indent then indent = 0 end
	for k, v in pairs(tbl) do
		formatting = string.rep("  ", indent) .. k .. ": "
		if type(v) == "table" then
			--env.info(formatting)
			tprint(v, indent + 1)
		elseif type(v) == 'boolean' then
			--env.info(formatting .. tostring(v))
		else
			--env.info(formatting .. tostring(v))
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
	[69] = "ITALIAN_SOCIAL_REPUBLIC",
	[70] = "ALGERIA",
	[71] = "KUWAIT",
	[72] = "QATAR",
	[73] = "OMAN",
	[73] = "UNITED_ARAB_EMIRATES"
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
	local crateCache = {}
	local livesCache = {}
	local sideLockCache = {}
	local completeAliveNames = {}
	local updateQue = { ["que"] = {} }

	local unitCnt = 0
	local checkUnitDead = {}
	local staticCnt = 0
	local checkStaticDead = {}
	local laserSpots = {}
	local IRSpots = {}

	package.path = package.path .. ";.\\LuaSocket\\?.lua"
	package.cpath = package.cpath .. ";.\\LuaSocket\\?.dll"

	require = dynamicDCS.require
	local socket = require("socket")
	local JSON = loadfile("Scripts\\JSON.lua")()
	require = nil
	local missionStartTime = os.time()
	local airbases = {}

	local function log(msg)
		--env.info("DynamicDCS (t=" .. timer.getTime() .. "): " .. msg)
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
											--env.info('poly: '..gName)
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
					curUnit.data.category = CategoryNames[unit:getDesc().category]
					if curUnit.data.category ~= "SHIP" then
						curUnit.data.groupId = group:getID()
						curUnit.data.unitId = tonumber(unit:getID())
						curUnit.data.name = unit:getName()
						table.insert(completeAliveNames, curUnit.data.name)
						--curUnit.data.life = tonumber(unit:getLife())
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
						local PlayerName = unit:getPlayerName()
						if PlayerName ~= nil then
							curUnit.data.playername = PlayerName
						else
							curUnit.data.playername = ""
						end
						curUnit.data.inAir = unit:inAir()
						if unitCache[curUnit.data.name] ~= nil and not Init then
							if unitCache[curUnit.data.name].lat ~= lat or unitCache[curUnit.data.name].lon ~= lon then
								unitCache[curUnit.data.name] = {}
								unitCache[curUnit.data.name].lat = lat
								unitCache[curUnit.data.name].lon = lon
								curUnit.action = "U"
								table.insert(updateQue.que, curUnit)
							end
						else
							unitCache[curUnit.data.name] = {}
							unitCache[curUnit.data.name].lat = lat
							unitCache[curUnit.data.name].lon = lon
							--local maxLife = unit:getLife0()
							--if maxLife ~= nil then
							--	curUnit.data.maxLife = tonumber(maxLife)
							--end
							curUnit.data.groupName = group:getName()
							curUnit.data.name = unit:getName()
							curUnit.data.type = unit:getTypeName()
							curUnit.data.coalition = coalition
							curUnit.data.country = CountryNames[unit:getCountry()]
							curUnit.action = "C"
							table.insert(updateQue.que, curUnit)
						end
						checkUnitDead[curUnit.data.name] = 1
					end
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
						name = k
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
				curStatic.data.name = static:getName()
				table.insert(completeAliveNames, curStatic.data.name)
				--curStatic.data.life = static:getLife()
				local staticPosition = static:getPosition()
				curStatic.data.lat, curStatic.data.lon, curStatic.data.alt = coord.LOtoLL(staticPosition.p)
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
				if staticCache[curStatic.data.name] ~= nil and not Init then
					if staticCache[curStatic.data.name].lat ~= lat or staticCache[curStatic.data.name].lon ~= lon then
						staticCache[curStatic.data.name] = {}
						staticCache[curStatic.data.name].lat = lat
						staticCache[curStatic.data.name].lon = lon
						curStatic.action = "U"
						table.insert(updateQue.que, curStatic)
					end
				else
					staticCache[curStatic.data.name] = {}
					staticCache[curStatic.data.name].lat = lat
					staticCache[curStatic.data.name].lon = lon
					curStatic.data.groupName = curStatic.data.name
					--curStatic.data.maxLife = tonumber(static:getLife())
					curStatic.data.category = CategoryNames[static:getDesc().category]
					curStatic.data.type = static:getTypeName()
					curStatic.data.coalition = coalition
					curStatic.data.country = CountryNames[static:getCountry()]
					curStatic.action = "C"
					table.insert(updateQue.que, curStatic)
				end
				checkStaticDead[curStatic.data.name] = 1
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
						name = k
					}
				}
				table.insert(updateQue.que, curStatic)
				staticCache[k] = nil
			end
			staticCnt = staticCnt + 1
		end
	end

	local function getDataMessage()
		completeAliveNames = {}
		updateGroups()
		updateStatics()

		--env.info('paySize: '..table.getn(updateQue.que));
		local chkSize = 100
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
			if request.action == "CRATEUPDATE" then
				if type(request.crateNames) == 'table' then
					local crateObjs = {};
					for nIndex = 1, #request.crateNames do
						local curCrateName = request.crateNames[nIndex]
						local crate = StaticObject.getByName(curCrateName)
						if crate ~= nil and crate:getLife() > 0 then
							local cratePosition = crate:getPosition()
							local lat, lon, alt = coord.LOtoLL(cratePosition.p)
							crateObjs[curCrateName] = {}
							crateObjs[curCrateName].lat = lat
							crateObjs[curCrateName].lon = lon
							crateObjs[curCrateName].alive = true
						else
							crateObjs[curCrateName] = {}
							crateObjs[curCrateName].alive = false
						end
					end
					table.insert(updateQue.que, {
						action = 'CRATEOBJUPDATE',
						callback = request.callback,
						unitId = request.unitId,
						data = crateObjs
					})
				end
			end
			if request.action == "REMOVEOBJECT" then
				--env.info('REMOVE OBJECT')
				local removeObj = Unit.getByName(request.removeObject)
				local removeObjStat = StaticObject.getByName(request.removeObject)
				if removeObj ~= nil then
					--env.info('Destroying '..request.removeObject)
					removeObj:destroy()
				elseif removeObjStat ~= nil then
					--env.info('Destroying Static '..request.removeObject)
					removeObjStat:destroy()
				end
			end
			if request.action == "ADDTASK" then
				--env.info('ADD TASK')
				if request.taskType == 'EWR' then
					local taskUnit = Unit.getByName(request.unitName)
					if taskUnit ~= nil then
						local _controller = taskUnit:getController();
						local _EWR = {
							id = 'EWR',
							auto = true,
							params = {
							}
						}
						_controller:setTask(_EWR)
					end
				end
			end
			if request.action == "SETLASERSMOKE" then
				--env.info('SET LASER SMOKE')
				local curJtacUnit = Unit.getByName(request.jtacUnitName)
				local curEnemyUnit = Unit.getByName(request.enemyUnitName)

				if curJtacUnit ~= nil and curEnemyUnit ~= nil then
					local _spots = {}

					local _enemyVector = curEnemyUnit:getPoint()
					local _enemyVectorUpdated = { x = _enemyVector.x, y = _enemyVector.y + 2.0, z = _enemyVector.z }

					local _oldLase = laserSpots[request.jtacUnitName]
					local _oldIR = IRSpots[request.jtacUnitName]

					if _oldLase == nil or _oldIR == nil then

						local _status, _result = pcall(function()
							_spots['irPoint'] = Spot.createInfraRed(curJtacUnit, { x = 0, y = 2.0, z = 0 }, _enemyVectorUpdated)
							_spots['laserPoint'] = Spot.createLaser(curJtacUnit, { x = 0, y = 2.0, z = 0 }, _enemyVectorUpdated, request.laserCode)
							return _spots
						end)

						if not _status then
							env.error('ERROR: ' .. _result, false)
						else
							if _result.irPoint then
								IRSpots[request.jtacUnitName] = _result.irPoint
							end
							if _result.laserPoint then
								laserSpots[request.jtacUnitName] = _result.laserPoint
							end
						end
					else
						if _oldLase ~= nil then
							_oldLase:setPoint(_enemyVectorUpdated)
						end

						if _oldIR ~= nil then
							_oldIR:setPoint(_enemyVectorUpdated)
						end
					end
					local elat, elon, ealt = coord.LOtoLL(_enemyVectorUpdated)
					local MGRS = coord.LLtoMGRS(coord.LOtoLL(_enemyVectorUpdated))
					local enemyType = curEnemyUnit:getTypeName()
					local mesg = "JTAC Has Placed Smoke And Is Now Lasing a "..enemyType.." on "..request.laserCode.." Lat:"..elat.." Lon:"..elon.." MGRS:"..MGRS.UTMZone..MGRS.MGRSDigraph.." "..MGRS.Easting.." "..MGRS.Northing
					trigger.action.outTextForCoalition(request.coalition, mesg, 15)
					if request.coalition == 1 then
						trigger.action.smoke(_enemyVectorUpdated, 4 )
					end
					if request.coalition == 2 then
						trigger.action.smoke(_enemyVectorUpdated, 1 )
					end
				end
			end
			if request.action == "REMOVELASERIR" then
				--env.info('REMOVE LASER')
				local _tempLase = laserSpots[request.jtacUnitName]

				if _tempLase ~= nil then
					Spot.destroy(_tempLase)
					laserSpots[request.jtacUnitName] = nil
					_tempLase = nil
				end

				local _tempIR = IRSpots[request.jtacUnitName]

				if _tempIR ~= nil then
					Spot.destroy(_tempIR)
					IRSpots[request.jtacUnitName] = nil
					_tempIR = nil
				end
			end
			if request.action == "ISLOSVISIBLE" then
				--env.info('IS LOS VISIBLE')
				--tprint(request, 1)
				local jtacUnit = Unit.getByName(request.jtacUnitName)
				if jtacUnit ~= nil then
					local jtacPOS = jtacUnit:getPoint()
					--tprint(jtacPOS, 1)
					local visableUnits = {}
					if type(request.enemyUnitNames) == 'table' then
						for nIndex = 1, #request.enemyUnitNames do
							local curUnit = Unit.getByName(request.enemyUnitNames[nIndex])
							if curUnit ~= nil then
								local enemyPOS = curUnit:getPoint()
								--tprint(enemyPOS, 1)
								local offsetEnemyPos = { x = enemyPOS.x, y = enemyPOS.y + 2.0, z = enemyPOS.z }
								local offsetJTACPos = { x = jtacPOS.x, y = jtacPOS.y + 2.0, z = jtacPOS.z }
								if land.isVisible(offsetEnemyPos, offsetJTACPos) then
									table.insert(visableUnits, request.enemyUnitNames[nIndex])
								end
							end
						end
					end
					table.insert(updateQue.que, {
						action = 'LOSVISIBLEUNITS',
						jtacUnitName = request.jtacUnitName,
						data = visableUnits
					})
				end
			end
			if request.action == "GETUNITSALIVE" then
				--env.info('GET UNITS ALIVE')
				table.insert(updateQue.que, {
					action = 'unitsAlive',
					data = completeAliveNames
				})
			end
			--if request.action == "SENDUNITSINFO" then
			--	if type(request.unitIds) == 'table' then
			--		for rIndex = 1, #request.unitIds do
			--			local curUnitId = request.unitIds[rIndex]
			--			env.info('SendUnits: '..curUnitId)
			--		end
			--	end
			--end
			if request.action == "SETBASEFLAGS" then
				--env.info('SET BASE FLAGS')
				if type(request.data) == 'table' then
					for rIndex = 1, #request.data do
						local curBase = request.data[rIndex].name
						local curSide = request.data[rIndex].side
						--env.info('BS: '..curBase..':'..curSide)
						if airbaseCache[curBase] ~= nil then
							airbaseCache[curBase] = {}
						end
						if airbaseCache[curBase].side ~= curSide and airbaseCache[curBase].side ~= 0 then
							airbaseCache[curBase].side = curSide
							trigger.action.setUserFlag(curBase, curSide)
						end
					end
				end
			end
			if request.action == "SETISOPENSLOT" then
				--env.info('SET ISOPENSLOT FLAG')
				trigger.action.setUserFlag('isOpenSlot', request.val)
			end
			if request.action == "SETCAPLIVES" then
				--env.info('SET CAP LIVES')
				if type(request.data) == 'table' then
					for rIndex = 1, #request.data do
						local curUcid = request.data[rIndex]
						if livesCache[curUcid.ucid] ~= nil then
							if livesCache[curUcid.ucid] ~= curUcid.val then
								livesCache[curUcid.ucid] = curUcid.val
								trigger.action.setUserFlag(curUcid.ucid, curUcid.val)
							end
						else
							livesCache[curUcid.ucid] = curUcid.val
							trigger.action.setUserFlag(curUcid.ucid, curUcid.val)
						end
					end
				end
			end
			if request.action == "SETSIDELOCK" then
				--env.info('SET SIDE LOCK')
				if type(request.data) == 'table' then
					for rIndex = 1, #request.data do
						local curUcid = request.data[rIndex]
						if sideLockCache[curUcid.ucid] ~= nil then
							if sideLockCache[curUcid.ucid] ~= curUcid.val then
								sideLockCache[curUcid.ucid] = curUcid.val
								trigger.action.setUserFlag(curUcid.ucid, curUcid.val)
							end
						else
							sideLockCache[curUcid.ucid] = curUcid.val
							trigger.action.setUserFlag(curUcid.ucid, curUcid.val)
						end
					end
				end
			end
			if request.action == "INIT" then
				--env.info('INIT')
				--send all unit updates
				--initAirbases()
				completeAliveNames = {}
				updateGroups(true)
				updateStatics(true)
			end
			if request.action == "CMD" and request.reqID ~= nil then
				if type(request.cmd) == 'table' then
					for rIndex = 1, #request.cmd do
						--env.info('CMD: '..request.cmd[rIndex])
						pcallCommand(request.cmd[rIndex], request.reqID)
					end
				end
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
				completeAliveNames = {}
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

	function sendCmd (cmdObj)
		table.insert(updateQue.que, cmdObj)
	end

	--Protected call to command execute
	function pcallCommand(s, respId)
		local success, resp = pcall(commandExecute, s)
		if success then
			if resp ~= nil then
				--local curUpdate;
				--curUpdate = {
				--	action = 'CMDRESPONSE',
				--	data = {
				--		respId = respId,
				--		cmd = s,
				--		response = resp
				--	}
				--}
				--table.insert(updateQue.que, curUpdate)
			end
		else
			log("Error: " .. resp)
		end
	end

	function commandExecute(s)
		--env.info(s)
		return loadstring("return " .. s)()
	end

	--Send Mission Events Back
	local eventTypes = {
		--[0] = "S_EVENT_INVALID",
		--[1] = "S_EVENT_SHOT",
		[2] = "S_EVENT_HIT",
		[3] = "S_EVENT_TAKEOFF",
		[4] = "S_EVENT_LAND",
		[5] = "S_EVENT_CRASH",
		[6] = "S_EVENT_EJECTION",
		--[7] = "S_EVENT_REFUELING",
		[8] = "S_EVENT_DEAD",
		[9] = "S_EVENT_PILOT_DEAD",
		--[10] = "S_EVENT_BASE_CAPTURED",
		--[11] = "S_EVENT_MISSION_START",
		--[12] = "S_EVENT_MISSION_END",
		--[13] = "S_EVENT_TOOK_CONTROL",
		--[14] = "S_EVENT_REFUELING_STOP",
		[15] = "S_EVENT_BIRTH",
		--[16] = "S_EVENT_HUMAN_FAILURE",
		--[17] = "S_EVENT_ENGINE_STARTUP",
		--[18] = "S_EVENT_ENGINE_SHUTDOWN",
		[19] = "S_EVENT_PLAYER_ENTER_UNIT",
		[20] = "S_EVENT_PLAYER_LEAVE_UNIT",
		[21] = "S_EVENT_PLAYER_COMMENT",
		--[22] = "S_EVENT_SHOOTING_START",
		--[23] = "S_EVENT_SHOOTING_END",
		--[24] = "S_EVENT_MAX"
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
			if _event == nil or _event.initiator == nil or eventTypes[_event.id] == nil then
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
					local getIId = _event.initiator:getID()
					if getIId ~= nil then
						curEvent.arg3 = tonumber(getIId)
					end

				end
				if _event.target ~= nil then
					local getTId = _event.target:getID()
					if getTId ~= nil then
						curEvent.arg4 = tonumber(getTId)
					end
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
				if client then
					--env.info('EVENT RUNNING')
					table.insert(updateQue.que, {
						action = eventTypes[_event.id],
						data = curEvent
					})
					return true
				end
			end
		end, _event)
		if (not status) then
			--env.info(string.format("Error while handling event %s", err), false)
		end
	end
end

world.addEventHandler(clientEventHandler)
env.info("dynamicDCSTrue event handler added")
