--dynamicDCSGameGUI to export player information and run player commands

local dynDCS = {};

local PORT = 3002
local DATA_TIMEOUT_SEC = 1

package.path  = package.path..";.\\LuaSocket\\?.lua;"
package.cpath = package.cpath..";.\\LuaSocket\\?.dll;"

local socket = require("socket")

local JSON = loadfile("Scripts\\JSON.lua")()

local function log(msg)
	net.log("DynamicDCSGameGUI: " .. msg)
end

local cacheDB = {}
local updateQue = {}
updateQue.que = {}

local function getDataMessage()
	--chunk send back updateQue.que
	local chkSize = 500
	local payload = {}
	payload.cmdMsg = {}
	for i = 1,chkSize do
		table.insert(payload.cmdMsg, updateQue.que[i])
		table.remove(updateQue.que, i)
	end
	return payload
end

local function runRequest(request)
	if request.action ~= nil then
		if request.action == "INIT" then
			log('RUNNING REQUEST INIT')
			cacheDB = {}
		end
		if request.action == "CMD" then
			if request.action == "CMD" and request.cmd ~= nil and request.reqID ~= nil then
				log('RUNNING CMD')
				pcallCommand(request.cmd, request.reqID)
			end
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
		end
	end

	if client then
		local line, err = client:receive()
		if line ~= nil then
			--log(line)
			local success, error =  pcall(checkJSON, line, 'decode')
			if success then
				log('Incoming: '..line);
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
	end
end

dynDCS.onChatMessage = function(message,playerID)
	if( message ~= nil ) then
		--log(message)
		local curUpdate = {
			type = 'MESG',
			data = {
				message = message,
				playerID = playerID
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
end

dynDCS.onGameEvent = function(eventName,arg1,arg2,arg3,arg4,arg5,arg6,arg7)
	local curUpdate = {}
	--log(eventName)
	if( eventName == "friendly_fire" ) then
		--"friendly_fire", playerID, weaponName, victimPlayerID
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				weaponName = arg2,
				victimPlayerID = arg3
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "mission_end" ) then
		--"mission_end", winner, msg
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				winner = arg1,
				msg = arg2
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "kill" ) then
		--"kill", killerPlayerID, killerUnitType, killerSide, victimPlayerID, victimUnitType, victimSide, weaponName
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				killerPlayerID = arg1,
				killerUnitType = arg2,
				killerSide = arg3,
				victimPlayerID = arg4,
				victimUnitType = arg5,
				victimSide = arg6,
				weaponName = arg7
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "self_kill" ) then
		--"self_kill", playerID
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "change_slot" ) then
		--"change_slot", playerID, slotID, prevSide
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				slotID = arg2,
				prevSide = arg3
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "connect" ) then
		--"connect", id, name
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				id = arg1,
				name = arg2
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "disconnect" ) then
		--"disconnect", ID_, name, playerSide, reason_code
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				ID_ = arg1,
				name = arg2,
				playerSide = arg3,
				reason_code = arg4
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "crash" ) then
		--"crash", playerID, unit_missionID
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				unit_missionID = arg2
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "eject" ) then
		--"eject", playerID, unit_missionID
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				unit_missionID = arg2
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "takeoff" ) then
		--"takeoff", playerID, unit_missionID, airdromeName
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				unit_missionID = arg2,
				airdromeName = arg3
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "landing" ) then
		--"landing", playerID, unit_missionID, airdromeName
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				unit_missionID = arg2,
				airdromeName = arg3
			}
		}
		table.insert(updateQue.que, curUpdate)
	end
	if( eventName == "pilot_death" ) then
		--"pilot_death", playerID, unit_missionID
		curUpdate = {
			type = eventName,
			data = {
				name = eventName,
				playerID = arg1,
				unit_missionID = arg2
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
				type = 'CMDRESPONSE',
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
