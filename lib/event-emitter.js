/**

 Example code:

 function MyEmitter() {
    module.exports.instantiateEmitter(this);

}
 module.exports.makeEmitter(MyEmitter);

 const myEmitter = new MyEmitter();
 myEmitter.on('event', function (arg) {
    console.log('an event occurred!', arg);
});
 myEmitter.emit('event', 'foo');
 */


var EventEmitter = require('events');
var util = require('util'); // this is node util
module.exports.makeEmitter = function (contructor) {
    util.inherits(contructor, EventEmitter);
};
module.exports.instantiateEmitter = function (object) {
    EventEmitter.call(object);
};

