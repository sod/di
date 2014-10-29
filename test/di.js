var sinon = require('sinon');
require('expectations');

describe("sod-di", function() {

	var diFactory = require('../di.js');

	it("case insensitive, di self register, prefix with di name access", function() {
		var foo = diFactory('foo');
		foo(function(di, DI, fooDi, foodi, FOODI) {
			expect(di).toBe(foo);
			expect(DI).toBe(foo);
			expect(fooDi).toBe(foo);
			expect(foodi).toBe(foo);
			expect(FOODI).toBe(foo);
		});
	});

	it("register()", function() {
		var foo = diFactory('foo');
		var service = function() {
			return 1;
		};
		expect(foo.get('service')).toBe(null);
		foo.register('service', service);
		expect(foo.get('service')).toBe(service);
	});

	it("registerFactory()", function() {
		var foo = diFactory('foo');
		var value = 123;
		var serviceCalled = 0;
		var service = function(fooValue, value) {
			serviceCalled += 1;
			return fooValue + value;
		};
		foo.register('value', value);
		foo.registerFactory('service', service);

		// fetch service twice, only executed once, gets dependencies itself
		expect(serviceCalled).toBe(0);
		expect(foo.get('service')).toBe(value + value);
		expect(foo.get('service')).toBe(value + value);
		expect(serviceCalled).toBe(1);

		// error if no method provided
		foo.registerFactory('fail', null, function(error) {
			expect(error instanceof Error).toBe(true);
		});
	});

	it("require()", function() {
		var foo = diFactory('foo');

		// return instance of error to provided errback
		foo.require('fail', function(error) {
			expect(error instanceof Error).toBe(true);
		});

		// throw if no callback provided and dependency is missing
		expect(function() {
			foo.require('fail');
		}).toThrow();

		expect(foo.require('di')).toBe(foo);
	});

	it("invoke()", function() {
		var foo = diFactory('foo');
		// check if alias exists
		expect(foo).toBe(foo.invoke);
	});

	it("newChild() inheritance", function() {
		// first
		var foo = diFactory('foo');
		// inheritance through newChild (creates new di + imports itself)
		var bar = foo.newChild('bar');
		// make bar di itself public
		bar.setPublic('di');
		// inheritance through imports argument
		var baz = diFactory('baz', [foo, bar]);

		// first has not imports
		expect(foo.getImportNames()).toEqual([]);
		// second has foo
		expect(bar.getImportNames()).toEqual(['foo']);
		// third got "foo" twice but should only have it once
		expect(baz.getImportNames()).toEqual(['foo', 'bar']);

		// di should be actual di, but you can access the rest by name
		baz(function(di, bazDi, barDi) {
			expect(di).toBe(baz);
			expect(bazDi).toBe(baz);
			expect(barDi).toBe(bar);
		});

		// fooDi must be null, because it is not set to public
		expect(baz.get('fooDi')).toBe(null);

		// set to public, now it is available
		foo.setPublic('di');
		expect(baz.get('fooDi')).toBe(foo);
	});

	describe("expose error class", function() {
		expect(diFactory.Error).toBeDefined();
		expect(diFactory.DependencyInjectionError).toBeDefined();
		expect(diFactory.DependencyInjectionError).toBe(diFactory.Error);
		expect(new diFactory.DependencyInjectionError() instanceof Error).toBe(true);
	});

	describe("error handling", function() {
		var foo = diFactory('foo');
		var errback;
		var brokenFn = function(missingA, di, missingB) {};
		brokenFn._filename = 'my/long/filename.js';

		it("di(false)", function() {
			// errback
			foo(false, false, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo(false);
			}).toThrow();
		});

		it("di(function(missingDependency){})", function() {
			// errback
			foo(brokenFn, false, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			// put missing dependencies into the message
			expect(errback.getCall(0).args[0].message).toMatch(/"missingA, missingB"/);
			// put method context into the message
			expect(errback.getCall(0).args[0].message).toMatch(/function *\( *missingA, *di, *missingB *\)/);
			// put fn._filename into the message
			expect(errback.getCall(0).args[0].message).toContain(brokenFn._filename);

			// without errback (throw)
			expect(function() {
				foo(brokenFn);
			}).toThrow();
		});

		it("di.require()", function() {
			// errback
			foo.require('unknown', errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo.require('unknown');
			}).toThrow();
		});

		it("di.registerFactory()", function() {
			// errback
			foo.require('unknown', errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo.registerFactory('x', false);
			}).toThrow();
		});

		it("di.callback(errback)", function() {
			// errback
			var cb = foo.callback(brokenFn, false, errback = sinon.spy());
			cb();
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				var cb = foo.callback(brokenFn);
				cb();
			}).toThrow();
		});
	});

	it("registerFile() - add filename to stack on error", function() {
		var foo = diFactory('foo');
		var file = require('path').join(__dirname, 'brokenDependency.js');
		foo.registerFile('dep', file);
		foo.require('dep', function(error) {
			expect(error.message.split(file).length).toBe(2);
		});
	});

	it("showDependencies()", function() {
		sinon.stub(console, 'log');

		var foo = diFactory('afoo').register('apriv', 1).register('apub', 1).setPublic('apub');
		var bar = diFactory('bbar').register('bpriv', 1).register('bpub', 1).setPublic('bpub');
		var baz = diFactory('cbaz').register('cpriv', 1).register('cpub', 1).setPublic('cpub');

		var result = '' +
			'Dependency Injector: afoo\n' +
			'\n' +
			'  afoo\n' +
			'    public\n' +
			'      apub\n' +
			'    private\n' +
			'      di\n' +
			'      apriv\n' +
			'  bbar (inherited)\n' +
			'    public\n' +
			'      bpub\n' +
			'  cbaz (inherited)\n' +
			'    public\n' +
			'      cpub\n';

		foo.import([bar, baz, /* catch circular: */ foo]);

		foo.showDependencies(function(output) {
			expect(output).toBe(result);
		});

		foo.showDependencies();
		sinon.assert.calledOnce(console.log);
		sinon.assert.calledWithMatch(console.log, result);

		// cancel on circular
		foo.showDependencies(function(output) {
			expect(output).toBe(undefined);
		}, true, {afoo: true});

		console.log.restore();
	});

	it("custom injections", function() {
		var foo = diFactory('foo');
		foo(function(di, value, vNull, vFalse) {
			expect(di).toBe(foo);
			expect(value).toBe(1);
			expect(vFalse).toBe(false);
			// null becomes changed to undefined as null itself is already the value for missing dependency
			expect(vNull).toBe(undefined);
		}, { value: 1, vNull: null, vFalse: false });
	});
});