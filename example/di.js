var diFactory = require('../di.js');
var di = diFactory();
di.register('pi').value(Math.PI);
di.register('logger').value(console);

module.exports = di;