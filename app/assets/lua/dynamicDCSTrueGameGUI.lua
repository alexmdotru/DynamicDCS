--dynamicDCSGameGUI to export player information and run player commands
local dynDCS = {}
local cacheDB = {}
local updateQue = {["que"] = {} }

local PORT = 3002
local DATA_TIMEOUT_SEC = 0.5

isLoadLock = false
isCapLives = false

package.path  = package.path..";.\\LuaSocket\\?.lua;"
package.cpath = package.cpath..";.\\LuaSocket\\?.dll;"

local socket = require("socket")

local JSON = loadfile("Scripts\\JSON.lua")()

local function log(msg)
	--net.log("DynamicDCSGameGUI: " .. msg)
end

local function clearVar()
	cacheDB = {}
	updateQue = {["que"] = {}}
end

coalitionLookup = {
	["neutral"] = 0,
	["red"] = 1,
	["blue"] = 2
}

capLives = {
	['F-15C'] = 1,
	['Su-27'] = 1,
	['Su-33'] = 1,
	['MiG-29A'] = 1,
	['MiG-29S'] = 1,
	['M-2000C'] = 1
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
	--chunk send back updateQue.que
	local chkSize = 500
	local payload = {}
	payload.que = {}
	for i = 1,chkSize do
		table.insert(payload.que, updateQue.que[i])
		table.remove(updateQue.que, i)
	end
	--log(JSON:encode(playerSync()))
	local curPlayers = playerSync()
	table.insert(payload.que, curPlayers)
	return payload
end

local function runRequest(request)
	if request.action ~= nil then
		--if request.action == "INIT" then
		--	log('RUNNING REQUEST INIT')
		--	cacheDB = {}
		--end
		if request.action == "CMD" and request.cmd ~= nil and request.reqID ~= nil then
			--net.log('RUNNING CMD')
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

function playerSync()
	local refreshPlayer = {}
	local playerTable = {}
	playerTable.action = 'players'
	playerTable.data = {}

	--buildPlayerTable
	local curPlayers = net.get_player_list()
	for key,value in pairs(curPlayers) do
		playerTable.data[value] = net.get_player_info(value)
		refreshPlayer[value] = 1
		local _playerId = playerTable.data[value].id
		local _slotId = playerTable.data[value].slot
		local _side = playerTable.data[value].side
		if  (_side ~=0 and  slotID ~='' and _slotId ~= nil)  then
			if not dynDCS.shouldAllowSlot(_playerId, _slotId) then
				dynDCS.rejectPlayer(_playerId)
			end
		end
	end

	for k, v in pairs( playerTable.data ) do
		if refreshPlayer[k] == nil then
			playerTable.data[k] = nil
		end
	end

	--net.log('playertable: '..JSON:encode(playerTable))
	return playerTable
end

local _lastSent = 0
dynDCS.onSimulationFrame = function()
	local _now = DCS.getRealTime()
	-- send every 1 second
	if _now > _lastSent + DATA_TIMEOUT_SEC then
		_lastSent = _now
		local success, error = pcall(step)
		if not success then
			log("Error: " .. error)
		end
		if updateQue.que ~= nil then
			--log('LogBuffer: '..table.getn(updateQue.que))
		end
	end
end

--dynDCS.onChatMessage = function(message,playerID)
--	if( message ~= nil ) then
--		--log(message)
--		local curUpdate = {
--			action = 'MESG',
--			data = {
--				message = message,
--				playerID = playerID
--			}
--		}
--		table.insert(updateQue.que, curUpdate)
--	end
--end

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
	--if( eventName == "mission_end" ) then
		--"mission_end", winner, msg
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
	--if( eventName == "kill" ) then
	--	--"kill", killerPlayerID, killerUnitType, killerSide, victimPlayerID, victimUnitType, victimSide, weaponName
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
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
	--if( eventName == "crash" ) then
	--	--"crash", playerID, unit_missionID
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
	--if( eventName == "eject" ) then
	--	--"eject", playerID, unit_missionID
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
	--if( eventName == "takeoff" ) then
	--	--"takeoff", playerID, unit_missionID, airdromeName
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
	--if( eventName == "landing" ) then
	--	--"landing", playerID, unit_missionID, airdromeName
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
	--if( eventName == "pilot_death" ) then
	--	--"pilot_death", playerID, unit_missionID
	--	curUpdate = {
	--		action = eventName,
	--		data = {
	--			name = eventName,
	--			arg1 = arg1,
	--			arg2 = arg2,
	--			arg3 = arg3,
	--			arg4 = arg4,
	--			arg5 = arg5,
	--			arg6 = arg6,
	--			arg7 = arg7,
	--			arg8 = arg8,
	--			arg9 = arg9
	--		}
	--	}
	--	table.insert(updateQue.que, curUpdate)
	--end
end

--Protected call to command execute
function pcallCommand(s, respID)
	local success, resp =  pcall(commandExecute, s)
	if success then
		if resp then
			local curUpdate
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
	return loadstring("return " ..s)()
end

function dynDCS.getFlagValue(_flag)
	local _status,_error  = net.dostring_in('server', " return trigger.misc.getUserFlag(\"".._flag.."\"); ")
	if not _status and _error then
		--net.log("error getting flag: ".._error)
		return 0
	else
		--net.log("flag value ".._flag.." value: ".._status)
		--disabled
		return tonumber(_status)
	end
end

function dynDCS.getUnitId(_slotID)
	local _unitId = tostring(_slotID)
	if string.find(tostring(_unitId),"_",1,true) then
		_unitId = string.sub(_unitId,1,string.find(_unitId,"_",1,true))
		--net.log("Unit ID Substr ".._unitId)
	end
	return tonumber(_unitId)
end

function dynDCS.shouldAllowSlot(_playerID, _slotID)
	isCapLives = false
	isLoadLock = false
	local _isOpenSlot = dynDCS.getFlagValue('isOpenSlot')
	--net.log('io'.._playerID..' '.._slotID..' '.._isOpenSlot)
	if _isOpenSlot ~= nil then
		_isOpenSlot = tonumber(_isOpenSlot)
	else
		_isOpenSlot = 0
	end
	--net.log('lockflag '.. _isOpenSlot)
	if _isOpenSlot == 0 then
		isLoadLock = true
		return false
	end
	local _unitId = dynDCS.getUnitId(_slotID)
	if _unitId == nil then
		return true
	end
	local curSide = coalitionLookup[DCS.getUnitProperty(_slotID, DCS.UNIT_COALITION)]
	local curType = DCS.getUnitProperty(_slotID, DCS.UNIT_TYPE)
	local curBaseName = DCS.getUnitProperty(_slotID, DCS.UNIT_NAME):split(' #')[1]:split("_Extension")[1]
	local curUcid = net.get_player_info(_playerID, 'ucid')
	local _baseFlag = dynDCS.getFlagValue(curBaseName)
	local _ucidFlag = dynDCS.getFlagValue(curUcid)
	--net.log(curBaseName.."_".._unitId..' flag:'.._baseFlag..' uSide:'..curSide..' ucidFlag: '.._ucidFlag..' ucid:'..curUcid)
	if _baseFlag == curSide then
		--net.log('STUFFF '..capLives[curType]..' - '..curType..' ucid: '.._ucidFlag)
		if _ucidFlag == 1 and capLives[curType] == 1 then
			--net.log('User Flagged For Cap Lives Used Up')
			isCapLives = true
			return false
		end
		--net.log('Base Slot Open')
		return true
	end
	return false
end

dynDCS.rejectPlayer = function(playerID)
	net.force_player_slot(playerID, 0, '')
	local _playerName = net.get_player_info(playerID, 'name')
	if _playerName ~= nil then
		--Disable chat message to user
		local _chatMessage
		if(isLoadLock) then
			_chatMessage = "***Slot DISABLED, Server Is Syncing Units***"
		elseif (isCapLives) then
			_chatMessage = "***Slot DISABLED, Your Modern Cap Lives Are Used Up***"
		else
			_chatMessage = "***Slot DISABLED, Capture This Airport***"
		end
		net.send_chat_to(_chatMessage, playerID)
	end
end

dynDCS.onPlayerTryChangeSlot = function(playerID, side, slotID)
	--net.log("SLOT - allowed -  playerid: "..playerID.." side:"..side.." slot: "..slotID)
	if  DCS.isServer() and DCS.isMultiplayer() then
		if  (side ~=0 and  slotID ~='' and slotID ~= nil)  then
			local _allow = dynDCS.shouldAllowSlot(playerID,slotID)
			if not _allow then
				dynDCS.rejectPlayer(playerID)
				return false
			end
		end
		return true
	end
end

DCS.setUserCallbacks(dynDCS)

net.log("Loaded - DynDCSGameGUI Server started")
