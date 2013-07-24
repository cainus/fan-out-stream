var dir = './lib/';
if (process.env.FANOUTSTREAM_COVERAGE){
  var dir = './lib-cov/';
}
module.exports = require(dir + 'FanOutStream');
