--dynamicDCSGameGUI to export player information and run player commands
function tprint(tbl, indent)
	if not indent then indent = 0 end
	for k, v in pairs(tbl) do
		formatting = string.rep("  ", indent) .. k .. ": "
		if type(v) == "table" then
			net.log(formatting)
			tprint(v, indent + 1)
		elseif type(v) == 'boolean' then
			net.log(formatting .. tostring(v))
		else
			net.log(formatting .. tostring(v))
		end
	end
end

local dynDCS = {}
local cacheDB = {}
local updateQue = {["que"] = {} }

local PORT = 3002
local DATA_TIMEOUT_SEC = 1

dynDCS.kickTimeInterval = 1
dynDCS.kickReset = true
dynDCS.kickTimePrev = 0

totalPlayers = 60

isLoadLock = false
isRedPlayerMax = false
isBluePlayerMax = false
isRedLocked = false
isBlueLocked = false
isGamemasterLock = false
curColor = ''

package.path  = package.path..";.\\LuaSocket\\?.lua;"
package.cpath = package.cpath..";.\\LuaSocket\\?.dll;"

local socket = require("socket")

local JSON = loadfile("Scripts\\JSON.lua")()

local function log(msg)
	--net.log("DynamicDCSGameGUI: " .. msg)
end

totalPerSide = totalPlayers / 2

local function clearVar()
	cacheDB = {}
	updateQue = {["que"] = {}}
end

coalitionLookup = {
	["neutral"] = 0,
	["red"] = 1,
	["blue"] = 2
}

function string:split( inSplitPattern, outResults )
	if not outResults then
		outResults = { }
	end
	local theStart = 1
	local theSplitStart, theSplitEnd = string.find( self, inSplitPattern, theStart )
	while theSplitStart do
		table.insert( outResults, string.sub( self, theStart, theSplitStart-1 ) )
		theStart = theSplitEnd + 1
		theSplitStart, theSplitEnd = string.find( self, inSplitPattern, theStart )
	end
	table.insert( outResults, string.sub( self, theStart ) )
	return outResults
end

local function getDataMessage()
	local chkSize = 500
	local payload = {}
	payload.que = {}
	for i = 1,chkSize do
		table.insert(payload.que, updateQue.que[i])
		table.remove(updateQue.que, i)
	end
	dynDCS.curPlayers = dynDCS.playerSync()
	table.insert(payload.que, dynDCS.curPlayers)
	table.insert(payload.que, {["action"] = 'mission', ["data"] = DCS.getMissionFilename()})
	return payload
end

local function runRequest(request)
	if request.action ~= nil then
		if request.action == "CMD" and request.cmd ~= nil and request.reqID ~= nil then
			pcallCommand(request.cmd, request.reqID)
		end
	end
end

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
			local success, error =  pcall(checkJSON, line, 'decode')
			if success then
				--log('Incoming: '..line)
				local incMsg = JSON:decode(line)
				runRequest(incMsg)
			else
				log("Error: " .. error)
			end
		end
		-- if there was no error, send it back to the client
		if not err then
			local dataPayload = {}
			if  DCS.isServer() and DCS.isMultiplayer() then
				dataPayload = getDataMessage()
			end
			local success, error = pcall(checkJSON, dataPayload, 'encode')
			if success then
				local outMsg = JSON:encode(dataPayload)
				local bytes, status, lastbyte = client:send(outMsg.."\n")
				if not bytes then
					log("Connection lost")
					client = nil
				end
			else
				log("Error: " .. error)
			end
		else
			log("Connection lost")
			client = nil
		end
	end
end
dynDCS.playerSync = function ()
	local refreshPlayer = {}
	local playerTable = {}
	playerTable.action = 'players'
	playerTable.data = {}
	local curPlayers = net.get_player_list()
	for key,value in pairs(curPlayers) do
		playerTable.data[value] = net.get_player_info(value)
		refreshPlayer[value] = 1
	end
	for k, v in pairs( playerTable.data ) do
		if refreshPlayer[k] == nil then
			playerTable.data[k] = nil
		end
	end
	return playerTable
end
local _lastSent = 0
dynDCS.onSimulationFrame = function()
	local _now = DCS.getRealTime()
	if _now > _lastSent + DATA_TIMEOUT_SEC then
		_lastSent = _now
		local success, error = pcall(step)
		if not success then
			log("Error: " .. error)
		end
	end
end

function pcallCommand(s, respID)
	local success, resp =  pcall(commandExecute, s)
	if not success then
		log("Error: " .. resp)
	end
end

function commandExecute(s)
	return loadstring("return " ..s)()
end

function dynDCS.getFlagValue(_flag)
	local _status,_error  = net.dostring_in('server', " return trigger.misc.getUserFlag(\"".._flag.."\"); ")
	if not _status and _error then
		return 0
	else
		return tonumber(_status)
	end
end

function dynDCS.getUnitId(_slotID)
	local _unitId = tostring(_slotID)
	if string.find(tostring(_unitId),"_",1,true) then
		_unitId = string.sub(_unitId,1,string.find(_unitId,"_",1,true))
	end
	return tonumber(_unitId)
end

function dynDCS.shouldAllowSlot(_playerID, slotID, side)
	isLoadLock = false
	isRedPlayerMax = false
	isBluePlayerMax = false
	isRedLocked = false
	isBlueLocked = false
	isGamemasterLock = false

	local curSides = {
		["red"] = 0,
		["blue"] = 0
	}

	local curPlayers = net.get_player_list()
	for key,value in pairs(curPlayers) do
		local playerInfo = net.get_player_info(value);
		if playerInfo.id ~= _playerID then
			if playerInfo.side == 1 then
				curSides.red = curSides.red + 1
			end
			if playerInfo.side == 2 then
				curSides.blue = curSides.blue + 1
			end
		end
	end
	if side == 1 then
		curSides.red = curSides.red + 1
	end
	if side == 2 then
		curSides.blue = curSides.blue + 1
	end

	local _isOpenSlot = dynDCS.getFlagValue('isOpenSlot')
	if _isOpenSlot ~= nil then
		_isOpenSlot = tonumber(_isOpenSlot)
	else
		_isOpenSlot = 0
	end
	if _isOpenSlot == 0 then
		isLoadLock = true
		return false
	end

	local curUcid = net.get_player_info(_playerID, 'ucid')
	if string.find(tostring(slotID),"instructor",1,true) then
		local _ucidFlagGM = dynDCS.getFlagValue(curUcid..'_GM')
		if _ucidFlagGM == 1 then
			return true
		end
		isGamemasterLock = true
		return false
	end
	local _ucidFlagRed = dynDCS.getFlagValue(curUcid..'_1')
	local _ucidFlagBlue = dynDCS.getFlagValue(curUcid..'_2')
	local _unitId = dynDCS.getUnitId(slotID)

	if _unitId == nil then
		local curColor = slotID:split('_')[3]
		if curColor == 'red' and curSides.red > totalPerSide then
			isRedPlayerMax = true
			return false
		end
		if curColor == 'blue' and curSides.blue > totalPerSide  then
			isBluePlayerMax = true
			return false
		end
		if _ucidFlagRed == 1 and curColor == 'blue' then
			isRedLocked = true
			return false
		end
		if _ucidFlagBlue == 1 and curColor == 'red' then
			isBlueLocked = true
			return false
		end
		return true
	end

	local curSide = coalitionLookup[DCS.getUnitProperty(slotID, DCS.UNIT_COALITION)]
	local curBaseName = DCS.getUnitProperty(slotID, DCS.UNIT_NAME):split(' #')[1]:split("_Extension")[1]
	local _baseFlag = dynDCS.getFlagValue(curBaseName)
	if _baseFlag == curSide then
		if curSides.red > totalPerSide and curSide == 1 then
			isRedPlayerMax = true
			return false
		end
		if curSides.blue > totalPerSide and curSide == 2 then
			isBluePlayerMax = true
			return false
		end
		if _ucidFlagRed == 1 and _baseFlag == 2 then
			isRedLocked = true
			return false
		end
		if _ucidFlagBlue == 1 and _baseFlag == 1 then
			isBlueLocked = true
			return false
		end
		return true
	end
	if curBaseName == 'Carrier1' and _ucidFlagBlue ~= 1 then
		return true
	end
	if curBaseName == 'Carrier2' and _ucidFlagRed ~= 1 then
		return true
	end
	return false
end

dynDCS.rejectPlayer = function(playerID)
	net.force_player_slot(playerID, 0, '')
	local _playerName = net.get_player_info(playerID, 'name')
	if _playerName == nil then
		_playerName = ""
	end
	if _playerName ~= nil then
		local _chatMessage
		if(isLoadLock) then
			_chatMessage = "***Slot DISABLED, Server Is Syncing Units***"
		elseif (isGamemasterLock) then
			_chatMessage = "***Slot DISABLED, Slot is only for Game Masters***"
		elseif (isRedPlayerMax) then
			_chatMessage = "***Side DISABLED, Maximum Amount Of Red Players Reached("..totalPerSide..")***"
		elseif (isBluePlayerMax) then
			_chatMessage = "***Side DISABLED, Maximum Amount Of Blue Players Reached("..totalPerSide..")***"
		elseif (isRedLocked) then
			_chatMessage = "***Slot DISABLED, You Are Locked To Red Side This Session***"
		elseif (isBlueLocked) then
			_chatMessage = "***Slot DISABLED, You Are Locked To Blue Side This Session***"
		else
			_chatMessage = "***Slot DISABLED, Capture This Airport***"
		end
		net.send_chat_to(_chatMessage, playerID)
		return false
	end
	return true
end

dynDCS.onGameEvent = function(eventName,arg1,arg2,arg3,arg4,arg5,arg6,arg7, arg8, arg9)
	local curUpdate = {}
	--log(eventName)
	if( eventName == "friendly_fire" ) then
		--"friendly_fire", playerID, weaponName, victimPlayerID
		curUpdate = {
			action = eventName,
			data = {
				name = eventName,
				arg1 = arg1,
				arg2 = arg2,
				arg3 = arg3,
				arg4 = arg4,
				arg5 = arg5,
				arg6 = arg6,
				arg7 = arg7,
				arg8 = arg8,
				arg9 = arg9
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "self_kill" ) then
		--"self_kill", playerID
		curUpdate = {
			action = eventName,
			data = {
				name = eventName,
				arg1 = arg1,
				arg2 = arg2,
				arg3 = arg3,
				arg4 = arg4,
				arg5 = arg5,
				arg6 = arg6,
				arg7 = arg7,
				arg8 = arg8,
				arg9 = arg9
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "change_slot" ) then
		--"change_slot", playerID, slotID, prevSide
		curUpdate = {
			action = eventName,
			data = {
				name = eventName,
				arg1 = arg1,
				arg2 = arg2,
				arg3 = arg3,
				arg4 = arg4,
				arg5 = arg5,
				arg6 = arg6,
				arg7 = arg7,
				arg8 = arg8,
				arg9 = arg9
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "connect" ) then
		--"connect", id, name
		curUpdate = {
			action = eventName,
			data = {
				name = eventName,
				arg1 = arg1,
				arg2 = arg2,
				arg3 = arg3,
				arg4 = arg4,
				arg5 = arg5,
				arg6 = arg6,
				arg7 = arg7,
				arg8 = arg8,
				arg9 = arg9
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "disconnect" ) then
		--"disconnect", ID_, name, playerSide, reason_code
		curUpdate = {
			action = eventName,
			data = {
				name = eventName,
				arg1 = arg1,
				arg2 = arg2,
				arg3 = arg3,
				arg4 = arg4,
				arg5 = arg5,
				arg6 = arg6,
				arg7 = arg7,
				arg8 = arg8,
				arg9 = arg9
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "change_slot" ) then
		net.log('change slot: '..arg1..' '..arg2)
	end
end

dynDCS.onPlayerChangeSlot = function(playerID)
	if  DCS.isServer() and DCS.isMultiplayer() then
		local slotID = net.get_player_info(playerID, 'slot')
		local side = net.get_player_info(playerID, 'side')
		if side ~=0 and  slotID ~='' and slotID ~= nil then
			local _allow = dynDCS.shouldAllowSlot(playerID, slotID, side)
			if not _allow then
				dynDCS.rejectPlayer(playerID)
				return
			end
		end
	end
	return true
end

DCS.setUserCallbacks(dynDCS)
net.log("Loaded - DDCSGameGUI Server started")
