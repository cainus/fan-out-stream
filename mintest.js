var util = require("util");
var stream = require("readable-stream");

var FanOutStream = function(options){
  options = options || {};
  this.writableFactory = options.writableFactory || defaultWritableFactory;
  this.poolSize = options.poolSize || 10;
  this.pool = [];
  for(var i = 0; i < this.poolSize; i++){
    var obj = this._getPoolObject(this.writableFactory);
    // tell the dest that it's being piped to
    obj.stream.emit('pipe', this);
    this.pool.push(obj);
  }
  stream.Writable.call(this, {objectMode : true, highWaterMark : 1});
  this.batch = [];
};

util.inherits(FanOutStream, stream.Writable);

FanOutStream.prototype._getPoolObject = function(){
  var that = this;
  var obj = {  ready : true,
               stream : this.writableFactory() };
  obj.stream.on('drain', function(){
      console.log("drain called!");
      obj.ready = true;
      that._onPoolReady();
  });
  obj.stream.on('finish', function(){
      console.log("finish called!");
      obj.ready = true;
  });
  console.log("stream: ", obj.stream);
  return obj;
};

FanOutStream.prototype._onPoolReady = function(){
  var that = this;
  if (this.batch.length === 0 && allStreamsAreReady(that.pool)){
    console.log("gimme more!");
    process.nextTick(function(){
      that._onReadyForMore();
    });
  } else {
    process.nextTick(function() {
      try {
        var stream = getFirstReadyStream(that.pool);
        stream.ready = false;
        that.emit('readable');
        console.log("emitted readable!");
        var retval = stream.stream.write(that.batch.shift());
        console.log("write returned: ", retval);
      } catch(ex){
        if (ex === 'no ready stream'){
          // do nothing.  The pool isn't really ready.
        } else {
          throw ex;
        }
      }
    });
  }
};

FanOutStream.prototype._write = function(batch, encoding, cb) {
  console.log("trying to write: ", batch);
  if (this.batch.length !== 0){
    return cb(false);
  }
  this.batch = batch;
  for(var i = 0; i < this.batch.length; i++){
    try {
      this._onPoolReady();
    } catch(ex){
      // do nothing.  we can get a stream later when it's ready.
      console.log("not ready!! ", ex);
    }
  }
  this._onReadyForMore = cb;
  return false;  // write no more!
};

var getFirstReadyStream = function(pool){
  for(var i = 0; i < pool.length; i++){
    if (pool[i].ready){
      return pool[i];
    }
  }
  throw "no ready stream";
};

var allStreamsAreReady = function(pool){
  for(var i = 0; i < pool.length; i++){
    if (!pool[i].ready){
      return false;
    }
  }
  return true;
};

var defaultWritableFactory = function(){
  var stringifier = new stream.Writable({objectMode : true});
  stringifier._write = function(chunk, encoding, cb){
    console.log(chunk);
    cb();
  };
  return stringifier;
};

//sloooowly writes out to stdout
var writableFactory = function(){
  var objectLogger = new stream.Writable({objectMode : true, highWaterMark : 1});
  objectLogger._write = function(chunk, encoding, cb){
    setTimeout(function(){
      console.log("writing: ", chunk);
      cb();
    }, 5000);
  };
  return objectLogger;
};

var randomObjectStream = new stream.Readable({objectMode : true});
randomObjectStream._read = function(){
  var that = this;
  setTimeout(function(){
    that.push([{value:Math.random()},
               {value:Math.random()},
               {value:Math.random()},
               {value:Math.random()}]);
  }, 2000);
};

fanout = new FanOutStream({ writableFactory : writableFactory, poolSize : 3 });
randomObjectStream.pipe(fanout);
