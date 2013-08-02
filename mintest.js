var FanOutStream = require('./index');
var stream = require("readable-stream");


//sloooowly writes out to stdout
var writableFactory = function(){
  var objectLogger = new stream.Writable({objectMode : true, highWaterMark : 1});
  objectLogger._write = function(chunk, encoding, cb){
    setTimeout(function(){
      console.log("writing: ", chunk);
      cb();
    }, Math.floor(Math.random() * 10000));
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

fanout = new FanOutStream({ writableFactory : writableFactory, poolSize : 1 });
randomObjectStream.pipe(fanout);
