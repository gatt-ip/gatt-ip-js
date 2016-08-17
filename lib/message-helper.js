var C = require('./constants').C;
var constantNames = {};
var InternalError = require('./../errors').InternalError;
var ApplicationError = require('./../errors').ApplicationError;

for (var name in C) {
    var code = C[name];
    if (name.indexOf('k') == 0) {
        name = name.substring(1, name.length);
        constantNames[code] = name;
    }
}

function recursiveToString(obj) {
    var ret = '';
    if (typeof obj == 'object') {
        if (Array.isArray(obj)) {
            var val = '';
            for (var i in obj) {
                if (0 != i) {
                    ret += ' ,';
                }
                ret += obj[i];
            }
        }
        for (var name in obj) {
            if (obj.hasOwnProperty(name)) {
                var value = obj[name];
                var constantName = constantNames[name];
                if (!constantName) {
                    constantName = name;
                }
                if ('object' == typeof value) {
                    if (Array.isArray(value)) {
                        ret += ' ' + constantName + ':[' + recursiveToString(value) + ']';
                    } else {
                        ret += ' ' + constantName + ':{' + recursiveToString(value) + '}';
                    }
                } else {
                    ret += ' ' + constantName + '=' + value;
                }
            }
        }
    }
    return ret;
}

module.exports.toString = function (message) {
    return recursiveToString(message.params).trim();
};

/**
 * Just a meaningful name because the requireFields function can handle
 */
module.exports.requireAndAssignParameters = function (callDescription, object, fields, values) {
    module.exports.requireFields(callDescription + " call parameters ", object, fields, values);
};


module.exports.requireBooleanValue = function (description, parameterName, value) {
    if (typeof value != 'boolean') {
        throw new ApplicationError(description + ' missing parameter ' + parameterName);
    }
};
module.exports.requireHexValue = function (description, parameterName, value) {
    if (typeof value != 'string') {
        throw new ApplicationError(description + ' missing parameter ' + parameterName);
    }
    if (value.length < 2 || value.length % 2 != 0 || !(/^[0-9a-fA-F]+$/.test(value))) {
        throw new ApplicationError(description + ' value ' + parameterName + ' is not a valid hex string');
    }
};
module.exports.requireUUID = function (description, parameterName, value) {
    if (typeof value != 'string') {
        throw new ApplicationError(description + ' missing parameter ' + parameterName);
    }
    if (value.length < 4 ||!(/^[0-9A-F-]+$/.test(value))) {
        throw new ApplicationError(description + ' value ' + parameterName + ' is not a valid UUID');
    }
};
module.exports.requireHexValues = function (description, parameterNames, hexValues) {
    var missingFields = [];
    if (!Array.isArray(parameterNames) || !Array.isArray(hexValues)) {
        throw new InternalError("Illegal use of requireHexValues");
    }
    for (var i in parameterNames) {
        var pName = parameterNames[i];
        var value = hexValues[i];

        if (typeof value != 'string' || value.length < 2 || value.length % 2 != 0 || !/^#[0-9A-F]$/i.test(value)) {
            missingFields.push(pName);
        }
    }

    if (missingFields) {
        throw new ApplicationError(description + ' missing parameters ' + missingFields);
    }
};

module.exports.requireFields = function (description, object, fields, defaultsOrValues) {
    var missingFields = [];
    if (!defaultsOrValues) {
        defaultsOrValues = {};
    }
    if (!object) {
        throw new InternalError(description + 'Object is undefined');
    }
    for (var i in fields) {
        var field = fields[i];
        if (typeof object[field] == undefined) {
            if (typeof defaultsOrValues[i] == undefined) {
                missingFields.push(fields);
            } else {
                object[field] = defaultsOrValues[i];
            }
        }
    }
    if (missingFields.length) {
        throw new InternalError(description + ' missing ' + missingFields);
    }
};

module.exports.requireAndPopulateFieldsFromCookie = function (callDescription, cookie, message) {
    if (!cookie) {
        throw new ApplicationError('Error: "' + callDescription + ' is missing the cookie');
    }
    if (!cookie.original.id) {
        throw new ApplicationError('Error: "' + callDescription + ' is missing the cookie ID');
    }
    if (!cookie.original.session_id) {
        throw new ApplicationError('Error: "' + callDescription + ' is missing the cookie session ID');
    }
    if (!cookie.original.method) {
        throw new ApplicationError('Error: "' + callDescription + ' is missing the cookie request');
    }

    message[C.kMessageId] = cookie.original.id;
    message[C.kSessionId] = cookie.original.session_id;
    message.result = cookie.result;
};

module.exports.populateParams = function (serviceTableObject, params) {
    if (!params) {
        params = {};
    }
    if (!serviceTableObject) {
        throw new InternalError('populateParams: service object is undefined');
    }

    var p;
    var s;
    var c;
    var d;
    var remainingParts = 23132;
    switch (serviceTableObject.type) {
        case 'd':
            remainingParts = 4;
            d = serviceTableObject;
            break;
        case 'c':
            remainingParts = 3;
            c = serviceTableObject;
            break;
        case 's':
            remainingParts = 2;
            s = serviceTableObject;
            break;
        case 'p':
            remainingParts = 1;
            p = serviceTableObject;
            break;
        default:
            throw new InternalError('type must be one of: "s", "c" or "d"');
            break;
    }

    function storeField(field, obj) {
        remainingParts--;
        var uuid = obj.uuid;
        if (!uuid) {
            throw new InternalError('UUID for object of type "' + obj.type + '" is missing');
        }
        params[field] = uuid;
    }

    if (d) {
        storeField(C.kDescriptorUUID, d);
        c = d.characteristic();
    }
    if (c) {
        storeField(C.kCharacteristicUUID, c);
        s = c.service();
    }
    if (s) {
        storeField(C.kServiceUUID, s);
        p = c.peripheral();
    }
    if (p) {
        storeField(C.kPeripheralUUID, p);
    }
    if (remainingParts != 0) {
        throw new InternalError('Expected ' + remainingParts + ' more parts when constructing params of ' + serviceTableObject.type);
    }
    return params;
};

