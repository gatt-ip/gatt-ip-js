var C = require('./constants').C;
function getDiscoverable(advdata, advArray) {
    var discoverableDataLength = parseInt(advArray[0], 16);
    if (parseInt(advArray[2], 16) >= 1) {
        advdata.discoverable = "true";
    } else
        advdata.discoverable = "false";
    advArray.splice(0, discoverableDataLength + 1);
}

function getTXLevel(advdata, advArray) {
    var txlevelDataLength = parseInt(advArray[0], 16);
    advdata.txPowerLevel = parseInt(advArray[2]);
    advArray.splice(0, txlevelDataLength + 1);
}

function getManufacturerData(advdata, advArray) {
    var manufacturerDataLength = parseInt(advArray[0], 16);
    if (manufacturerDataLength > 2) {
        var mfrKey = advArray[3] + advArray[2];
        var mfrData = '';
        for (var k = 4; k <= manufacturerDataLength; k++) {
            mfrData += advArray[k];
        }
        advdata.manufacturerData[mfrKey] = mfrData;
    }
    advArray.splice(0, manufacturerDataLength + 1);
}

function getServiceUUIDs(advdata, advArray) {
    var service16bitDataLength = parseInt(advArray[0], 16);
    var reverse16bitUUID = '';
    for (var i = service16bitDataLength; i >= 2; i--) {
        reverse16bitUUID += advArray[i];
    }
    advdata.serviceUUIDs = reverse16bitUUID;
    advArray.splice(0, service16bitDataLength + 1);
}

function get128bitServiceUUIDs(advdata, advArray) {
    var service128bitDataLength = parseInt(advArray[0], 16);
    var reverse128bitUUID = '';
    for (var i = service128bitDataLength; i >= 2; i--) {
        reverse128bitUUID += advArray[i];
        if (i == 14 || i == 12 || i == 10 || i == 8) {
            reverse128bitUUID += "-";
        }
    }
    advdata.serviceUUIDs = reverse128bitUUID;
    advArray.splice(0, service128bitDataLength + 1);
}

function getServiceData(advdata, advArray) {
    var serviceDataLength = parseInt(advArray[0], 16);
    var eddystoneServiceUUID = '';
    for (var i = 3; i >= 2; i--) {
        eddystoneServiceUUID += advArray[i];
    }
    if (eddystoneServiceUUID == 'FEAA') {
        if (parseInt(advArray[4], 16) === 0) {
            getUID(advdata);
        } else if (parseInt(advArray[4], 16) == 16) {
            getURL(advdata);
        } else if (parseInt(advArray[4], 16) == 32) {
            getTLM(advdata);
        }
    }
    advArray.splice(0, serviceDataLength + 1);
}

function getUID(advdata, advArray) {
    advdata.frameType = 'UID';
    advdata.nameSpace = '';
    advdata.instanceID = '';
    advdata.txPowerLevel = parseInt(advArray[5], 16);
    for (var i = 6; i < 16; i++) {
        advdata.nameSpace += advArray[i];
    }
    for (var j = 16; j < 22; j++) {
        advdata.instanceID += advArray[j];
    }
    advdata.reserved = advArray[22];
    advdata.reserved += advArray[23];
}

function getURL(advdata, advArray) {
    advdata.frameType = 'URL';
    advdata.txPowerLevel = parseInt(advArray[5]);
    for (var protocol in C.AllProtocols) {
        if (advArray[6] == protocol)
            advdata.url = C.AllProtocols[protocol];
    }
    for (var i = 7; i < advArrayLength; i++) {
        advdata.url += String.fromCharCode(parseInt(advArray[i], 16));
    }
    for (var domain in C.AllDomains) {
        if (advArray[advArrayLength] == domain)
            advdata.url += C.AllDomains[domain];
    }
}

function getTLM(advdata, advArray) {
    advdata.frameType = 'TLM';
    advdata.advPacketCount = '';
    advdata.timeInterval = '';
    advdata.batteryVoltage = '';
    advdata.eddyVersion = parseInt(advArray[5], 16);
    for (var i = 6; i < 8; i++) {
        advdata.batteryVoltage += advArray[i];
    }
    advdata.batteryVoltage = parseInt(advdata.batteryVoltage, 16);
    advdata.temperature = Math.ceil(parseInt(advArray[8], 16));
    advdata.temperature += '.';
    var temp = Math.ceil(((1 / 256) * parseInt(advArray[9], 16)));
    if (temp.length > 2)
        advdata.temperature += temp.toString().substring(0, 2);
    else
        advdata.temperature += temp;
    for (var j = 10; j < 14; j++) {
        advdata.advPacketCount += advArray[j];
    }
    advdata.advPacketCount = parseInt(advdata.advPacketCount, 16);
    for (var k = 14; k < 18; k++) {
        advdata.timeInterval += advArray[k];
    }
    advdata.timeInterval = Math.ceil(parseInt(advdata.timeInterval, 16) * 0.1);
    advdata.timePeriod = '';
    if (advdata.timeInterval >= 60) {
        var days = Math.floor(advdata.timeInterval / 86400);
        if (days > 0) {
            advdata.timePeriod += days < 10 ? days + 'day ' : days + 'days ';
            advdata.timeInterval -= days * 24 * 60 * 60;
        }
        var hours = Math.floor(advdata.timeInterval / 3600);
        if (hours > 0) {
            advdata.timePeriod += hours < 10 ? '0' + hours + ':' : hours + ':';
            advdata.timeInterval -= hours * 60 * 60;
        } else
            advdata.timePeriod += '00:';
        var min = Math.floor(advdata.timeInterval / 60);
        if (min > 0) {
            advdata.timePeriod += min < 10 ? '0' + min + ':' : min + ':';
            advdata.timeInterval -= min * 60;
            advdata.timePeriod += advdata.timeInterval < 10 ? '0' + advdata.timeInterval : advdata.timeInterval;
            advdata.timePeriod += ' secs';
            advdata.timeInterval = 0;
        } else {
            advdata.timePeriod += '00:' + advdata.timeInterval;
            advdata.timeInterval = 0;
        }
    } else if (advdata.timeInterval > 0 && advdata.timeInterval < 60) {
        advdata.timePeriod += advdata.timeInterval < 10 ? '00:00:0' + advdata.timeInterval : '00:00:' + advdata.timeInterval;
        advdata.timePeriod += ' secs';
    }
}

module.exports.parseAdvArray = function (peripheral, rawAdvertisingData) {
    if (!peripheral.advdata) {
        peripheral.advdata = {};
    }
    var advdata = peripheral.advdata;
    if(!advdata.manufacturerData){
        advdata.manufacturerData = {};
    }
    if(!advdata.serviceUUIDs){
        advdata.serviceUUIDs = [];
    }
    if (!rawAdvertisingData) {
        return [];
    }
    var advArray = [];
    if (rawAdvertisingData.length % 2 === 0) {
        for (var i = 0; i < rawAdvertisingData.length; i = i + 2) {
            advArray[i / 2] = rawAdvertisingData.charAt(i) + rawAdvertisingData.charAt(i + 1);
        }
    } else {
        for (var j = 0; j < rawAdvertisingData.length; j++) {
            advArray[j] = rawAdvertisingData.charAt(2 * j) + rawAdvertisingData.charAt(2 * j + 1);
        }
    }

    do {
        var type = advArray[1];
        if (type == C.kGAP_ADTYPE_FLAGS) {
            getDiscoverable(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_POWER_LEVEL) {
            getTXLevel(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_INCOMPLETE_16BIT_SERVICEUUID || type == C.kGAP_ADTYPE_COMPLETE_16BIT_SERVICEUUID) {
            getServiceUUIDs(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_INCOMPLETE_32BIT_SERVICEUUID || type == C.kGAP_ADTYPE_COMPLETE_32BIT_SERVICEUUID) {
            getServiceUUIDs(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_INCOMPLETE_128BIT_SERVICEUUID || type == C.kGAP_ADTYPE_COMPLETE_128BIT_SERVICEUUID) {
            get128bitServiceUUIDs(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_MANUFACTURER_SPECIFIC) {
            getManufacturerData(advdata, advArray);
        } else if (type == C.kGAP_ADTYPE_16BIT_SERVICE_DATA) {
            getServiceData(advdata, advArray);
        } else if (type == "00") {
            advArray.splice(0, 1);
        } else {
            var advArrayLength = parseInt(advArray[0], 16);
            advArray.splice(0, advArrayLength + 1);
        }
        if (advArray.length === 0) {
            break;
        }
    } while (true);
};