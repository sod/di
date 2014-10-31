var di = require('./../di');
var assert = require('assert');

di.file([__dirname, '..', 'implementation.js'], {
	logger: {
		log: function(value) {
			assert.ok(value === di.get('pi'));
		}
	}
});

console.log('TESTS PASSED');