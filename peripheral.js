var C = require('./lib/constants.js').C;
var helper = require('./lib/message-helper');
var advDataParser = require('./lib/message-advdata-parser');
var ee = require("./lib/event-emitter");
var serviceTable = require("./lib/service-table");
var Service = require("./service").Service;

function pushUnique(array, item) {
    if (array.indexOf(item) == -1) {
        array.push(item);
        return true;
    }
    return false;
}


// TODO: Errors if not connected
function Peripheral(gattip, uuid, name, rssi, txPwr, connectable, serviceUuids, mfrData, svcData) {
    ee.instantiateEmitter(this);
    var self = this;
    this.type = 'p';
    this.uuid = uuid;
    this.isConnected = false;
    var services = {};
    var manufacturerData = {};
    var serviceData = {};
    var serviceUUIDs = [];
    // constructor continues below
    this._updateFromScanData = function (name, rssi, txPwr, connectable, serviceUuids, mfrData, svcData, addata, scanData) {
        this.name = name;
        this.rssi = rssi;
        this.txPowerLevel = txPwr;
        this.connectable = connectable;
        var advertisementData = addata;
        var scanData = scanData;

        if (mfrData) {
            for (var mfrId in mfrData) {
                //TODO: Once we have 2.0, then we can remove toUpperCase()
                //noinspection JSUnfilteredForInLoop
                var id = mfrId.toUpperCase();
                //noinspection JSUnfilteredForInLoop
                manufacturerData[id] = mfrData[mfrId].toUpperCase();
            }
        }
        if (svcData) {
            for (var serUUID in svcData) {
                //noinspection JSUnfilteredForInLoop
                serviceData[serUUID] = svcData[serUUID];
            }
        }
        if (serviceUuids) {
            for (var sidx = 0; sidx < serviceUuids.length; sidx++) {
                pushUnique(serviceUUIDs, serviceUuids[sidx]);
            }
        }
        if (addata) {
            advDataParser.parseAdvArray(self, addata.c2);
            if(self.advdata.connectable){
                self.connectable = self.advdata.connectable === 'true';
            }
            if(self.advdata.txPowerLevel){
                this.txPowerLevel = self.advdata.txPowerLevel;
            }
            if(self.advdata.manufacturerData && !helper.isEmpty(self.advdata.manufacturerData)){
                for(var mfrKey in self.advdata.manufacturerData){
                    //noinspection JSUnfilteredForInLoop
                    var mKey = mfrKey.toUpperCase();
                    //noinspection JSUnfilteredForInLoop
                    manufacturerData[mKey] = self.advdata.manufacturerData[mfrKey].toUpperCase();
                }
            }
            // Thinking that always will get only one service UUID from the adv data.
            if(self.advdata.serviceUUIDs && self.advdata.serviceUUIDs.length > 0){
                pushUnique(serviceUUIDs, self.advdata.serviceUUIDs);
            }
        }

    };
    this.findService = function (uuid) {
        return services[uuid];
    };
    this.getMfrData = function (mfrId) {
        // id as hex string
        return manufacturerData[mfrId];
    };
    this.getSvcData = function (svcId) {
        // id as hex string
        return serviceData[svcId];
    };
    this.hasAdvertisedServiceUUID = function (serviceUUID) {
        return (serviceUUIDs.indexOf(serviceUUID) >= 0);
    };
    this.getAllServices = function () {
        return services;
    };
    this.getAllMfrData = function () {
        return manufacturerData;
    };
    this.getAllSvcData = function () {
        return serviceData;
    };
    this.getAllAdvertisedServiceUUIDs = function () {
        return serviceUUIDs;
    };
    this.addServiceWithUUID = function (serviceUUID) {
        var service = new Service(self, serviceUUID);
        return services[serviceUUID] = service;
    };
    this.addService = function (service) {
        return services[service.uuid] = service;
    };
    this.gattip = function () {
        return gattip;
    };


    // SERVER RESPONSES/INDICATIONS  ============================

    this.connectOnce = function (callback) {
        // TODO: Error if already connected
        var params = helper.populateParams(self);
        gattip.request(C.kConnect, params, callback, function (params) {
            serviceTable.parseServiceRecord(self, params);
            self.isConnected = true;
            gattip.fulfill(callback, self);
        });
    };


    /**
     * Attempts to connect to the peripheral
     * @param callback
     * @param config Optional object with numConnectAttempts. This value defaults to 3,
     * but may change to 1 in the future
     */
    this.connect = function (callback, config) {
        // TODO: Error if already connected

        var fullfillCb = (typeof callback == 'object' ? callback.fulfill : callback);

        var tries = C.NUM_CONNECT_ATTEMPTS;

        if (config && typeof config.numConnectAttempts == 'number') {
            tries = config.numConnectAttempts;
        }
        function tryConnect(error) {
            if (error) {
                console.log("Failed to connect. Error was", error, "Attempting", tries, "more times");
            }
            tries--;
            if (tries >= 0) {
                self.connectOnce({fulfill: fullfillCb, reject: tryConnect});
            } else {
                gattip.reject(callback, error)
            }
        }

        tryConnect();
    };

    this.disconnect = function (callback) {
        // TODO: Error if not connected
        var params = helper.populateParams(self);
        gattip.request(C.kDisconnect, params, callback, function (params) {
            self.isConnected = false;
            self.removeAllChildListenersAndFlush();
            gattip.fulfill(callback, self);
        });
    };

    this.respondToConnectRequest = function (cookie) {
        var peripheral_db = {};
        peripheral_db[C.kPeripheralUUID] = this.uuid;
        peripheral_db[C.kPeripheralName] = this.name;

        var service_db;
        service_db = serviceTable.getServiceJsonFromPeripheralObject(this);
        peripheral_db[C.kServices] = service_db;

        cookie.result = C.kConnect;
        gattip.respond(cookie, peripheral_db);
    };

    this.handleDisconnectIndication = function () {
        self.isConnected = false;
        self.emit('disconnected', self);
        self.removeAllChildListenersAndFlush();
    };

    this.removeAllChildListenersAndFlush = function () {
        gattip.flushRequests(function (context) {
            if (uuid && context && context.originalMessage && context.originalMessage.params) {
                return context.originalMessage.params[C.kPeripheralUUID] === uuid;

            }
        });
        for (var sIdx = 0; sIdx < Object.keys(services).length; sIdx++) {
            if (services.hasOwnProperty(sIdx)) {
                var s = services[sIdx];
                var characteristics = p.getAllCharacteristics();
                for (var cIdx = 0; cIdx < Object.keys(characteristics).length; cIdx++) {
                    if (services.hasOwnProperty(cIdx)) {
                        var c = services[cIdx];
                        c.removeAllListeners();
                    }
                }
            }
        }
        services = {};
    };

    this._updateFromScanData(name, rssi, txPwr, connectable, serviceUuids, mfrData, svcData);
}

ee.makeEmitter(Peripheral);

module.exports.Peripheral = Peripheral;
