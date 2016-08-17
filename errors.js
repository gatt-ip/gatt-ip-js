//TODO: Review which ones application errorrs, which ones are internal (gateway protocol not understood oro something went wrong) and which ones are errors from Gateway/Bluetooth

module.exports.ApplicationError = function (message) {
    this.message = "Application Error:" + message;
    Error.captureStackTrace(this, module.exports.ApplicationError);

};

module.exports.InternalError = function (message) {
    this.message = "Application Error:" + message;
    Error.captureStackTrace(this, module.exports.InternalError);
};

module.exports.GatewayError = function (params) {
    if (typeof params == 'object') {
        this.message = "Gateway Error:";
        if (params.message) {
            this.message += " " + params.message;
        }
        if (params.code) {
            this.message += " Code:" + params.code;
        }
        if (0 == this.message.length) {
            this.message = "Unknown Gateway Error"
        }
    } else {
        this.message = params;
    }
    Error.captureStackTrace(this, module.exports.GatewayError);
};
