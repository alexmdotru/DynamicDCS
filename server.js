var _ = require('lodash');
var express = require('express');

//startup node server
var app = express();

// app.use/routes/etc...
app.use('/', express.static(__dirname + '/dist'));
app.use('/json', express.static(__dirname + '/app/assets/json'));
app.use('/libs', express.static(__dirname + '/node_modules'));

var server  = app.listen(8080);
var io  = require('socket.io').listen(server);

//setup globals
var serverObject = {};
var updSrvObj = {};
_.set(serverObject, 'units', []);
_.set(serverObject, 'requestArray', []);


//setup socket io
io.on('connection', function( socket ){
    console.log(socket.id);
    //send full payload on connect, then just updates
    updSrvObj = _.cloneDeep(serverObject);
    _.set(updSrvObj, 'action', "INIT");
    io.to(socket.id).emit('srvUpd', updSrvObj);
    socket.on('disconnect', function(){
        console.log(socket.id+' user disconnected');
    });
});

console.log(':: SERVER IS RUNNING!');

_.set(serverObject, 'unitParse', function (unit) {
    var curUnit = {};

    if (_.get(unit, 'action') == 'C') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).action = 'U';
        }else{
            curUnit = {
                unitID: _.get(unit, 'unitID'),
                type: _.get(unit, 'type'),
                coalition: _.get(unit, 'coalition'),
                lat: _.get(unit, 'lat'),
                lon: _.get(unit, 'lon'),
                playername: _.get(unit, 'playername', '')
            };
            _.set(curUnit, 'action', 'C');
            serverObject.units.push(_.cloneDeep(curUnit));
            io.emit('srvUnitUpd', curUnit);
        }
    }
    if (_.get(unit, 'action') == 'U') {
        if (typeof _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }) !== "undefined") {
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).lat = _.get(unit, 'lat');
            _.find(serverObject.units, { 'unitID': _.get(unit, 'unitID') }).lon =  _.get(unit, 'lon');
            curUnit = {
                unitID: _.get(unit, 'unitID'),
                lat: _.get(unit, 'lat'),
                lon: _.get(unit, 'lon'),
                action: 'U'
            };
            io.emit('srvUnitUpd', curUnit);
        }
    }
    if (_.get(unit, 'action') == 'D') {
        var delIdx = _.findIndex(serverObject.units, { 'unitID': _.get(unit, 'unitID') });
        serverObject.units.remove(delIdx);
        curUnit = {
            unitID: _.get(unit, 'unitID'),
            action: 'D'
        };
        io.emit('srvUnitUpd', curUnit);
    }
    return true;
});

function getDCSData(dataCallback) {

    const PORT = 3001;
    const ADDRESS = "127.0.0.1";
    var connOpen = true;

    const net = require('net');
    var buffer;

    function connect() {

        //gather request from request array
        var request = _.get(serverObject, 'requestArray[0]',"NONE");

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            var time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS server!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
            updSrvObj = _.cloneDeep(serverObject);
            _.set(updSrvObj, 'action', "INIT");
            io.emit('srvUpd', updSrvObj);
            client.write('{"action":"INIT"}'+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                var data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
                client.write('{"action":"'+request+'"'+"}\n");
                _.get(serverObject, 'requestArray').shift();
            }
        });

        client.on('close', () => {
            time = new Date();
            //console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting....');
            connOpen = true;
        });

        client.on('error', () => {
            connOpen = true;
        });
    }

    setInterval(function(){
        if (connOpen === true) {
            connect();
        }else{
        }
    }, 1 * 500);

};

getDCSData(syncDCSData);

function syncDCSData (DCSData) {
    if (!_.isEmpty(DCSData.units)) {
        _.forEach(DCSData.units, serverObject.unitParse);
    }
}
