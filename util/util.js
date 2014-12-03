function Util()
{
    this.updatesignalimage = function(peripheral)
    {
        if(Math.abs(peripheral.rssi) <10 ) {
            peripheral.image = "images/signal_5.png";
        }
        else if(Math.abs(peripheral.rssi) <30 ) {
            peripheral.image = "images/signal_4.png";
        }
        else if(Math.abs(peripheral.rssi) <50 ) {
            peripheral.image = "images/signal_3.png";
        }
        else if(Math.abs(peripheral.rssi) <70 ) {
            peripheral.image = "images/signal_2.png";
        }
        else {
            peripheral.image = "images/signal_1.png";
        }

        return peripheral;
    };
    
    this.hex2a = function(hexx) {
        var hex = hexx.toString();
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    };
    
    this.hex2dec = function(hexx) {
        return parseInt(hexx, 16);
    };
    
    this.hex2b = function(hexx) {
        var num = hex2i(hexx);
        return num.toString(2);
    };

    this.a2hex = function(asci){
        var str = '';
        for (a = 0; a < asci.length; a++) {
            str = str + asci.charCodeAt(a).toString(16);
        }
        return str;
    };
    
    this.dec2hex = function(d) {
        var hex = Number(d).toString(16);
        while (hex.length < 2) {
            hex = "0" + hex;
        }

        return hex;
    };
    
    return this;
}
