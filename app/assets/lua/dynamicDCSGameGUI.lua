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

local function getDataMessage()
	return 'Data Message'
end

local function runRequest(request)
	if request.action ~= nil then
		if request.action == "INIT" then
			log('RUNNING REQUEST INIT')
			cacheDB = {}
		end
		if request.action == "CMD" then
			if request.action == "CMD" and request.cmd ~= nil then
				log('RUNNING CMD')
				log(pcallCommand(request.cmd))
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

	-- send every 5 seconds
	if _now > _lastSent + 5.0 then
		_lastSent = _now
		local success, error = pcall(step)
		if not success then
			log("Error: " .. error)
		end
	end

end

--Protected call to command execute
function pcallCommand(s)
	pcall(commandExecute, s)
end

function commandExecute(s)
	loadstring(s)()
end


DCS.setUserCallbacks(dynDCS)

net.log("Loaded - GameGUI Server started")
