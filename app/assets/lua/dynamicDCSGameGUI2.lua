--dynamicDCSGameGUI to export player information and run player commands

local dynDCS = {}
local cacheDB = {}
local updateQue = {["que"] = {}}

local PORT = 3012
local DATA_TIMEOUT_SEC = 1

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
			log('RUNNING CMD')
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
				--log('Incoming: '..line);
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
				local bytes, status, lastbyte = client:send(outMsg.."\n")
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
	end

	for k, v in pairs( playerTable.data ) do
		if refreshPlayer[k] == nil then
			playerTable.data[k] = nil
		end
	end
	--log('playertable: '..JSON:encode(playerTable))
	return playerTable;
end

local _lastSent = 0;
dynDCS.onSimulationFrame = function()
	local _now = DCS.getRealTime()
	-- send every 1 second
	if _now > _lastSent + 1.0 then
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

dynDCS.onChatMessage = function(message,playerID)
	if( message ~= nil ) then
		--log(message)
		local curUpdate = {
			action = 'MESG',
			data = {
				message = message,
				playerID = playerID
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
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
	if( eventName == "mission_end" ) then
		--"mission_end", winner, msg
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
	if( eventName == "kill" ) then
		--"kill", killerPlayerID, killerUnitType, killerSide, victimPlayerID, victimUnitType, victimSide, weaponName
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
	if( eventName == "crash" ) then
		--"crash", playerID, unit_missionID
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
	if( eventName == "eject" ) then
		--"eject", playerID, unit_missionID
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
	if( eventName == "takeoff" ) then
		--"takeoff", playerID, unit_missionID, airdromeName
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
	if( eventName == "landing" ) then
		--"landing", playerID, unit_missionID, airdromeName
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
	if( eventName == "pilot_death" ) then
		--"pilot_death", playerID, unit_missionID
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
end

--Protected call to command execute
function pcallCommand(s, respID)
	local success, resp =  pcall(commandExecute, s)
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
	return loadstring("return " ..s)()
end


DCS.setUserCallbacks(dynDCS)

net.log("Loaded - GameGUI Server started")
