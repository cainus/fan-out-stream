var util = require("util");
var stream = require("readable-stream");


var FanOutStream = function(options){
  options = options || {};
  objectMode = options.objectMode || false;
  this.writableFactory = options.writableFactory || defaultWritableFactory;
  this.poolSize = options.poolSize || 10;
  this.pool = [];
  for(var i = 0; i < this.poolSize; i++){
    this.pool.push(this.writableFactory());
  }
  stream.Writable.call(this, {objectMode : objectMode});
};

util.inherits(FanOutStream, stream.Writable);

FanOutStream.prototype._write = function(chunk, encoding, cb) {
  this.pool[0].write(chunk);
};

var defaultWritableFactory = function(){
  var stringifier = new stream.Writable({objectMode : true});
  stringifier._write = function(chunk, encoding, cb){
    console.log(chunk);
    cb();
  };
  return stringifier;
};


module.exports = FanOutStream;
