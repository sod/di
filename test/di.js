var sinon = require('sinon');
require('expectations');

describe("sod-di", function() {

	var diFactory = require(process.argv.indexOf('html-cov') !== -1 ? '../di-cov.js' : '../di.js');
	var testfileFnParts = [__dirname, '../fixture/dependencyFn.js'];
	var testfileFn = require('path').join(__dirname, testfileFnParts[1]);
	var testfileValue = require('path').join(__dirname, '../fixture/dependencyValue.js');
	var testfileError = require('path').join(__dirname, '../fixture/dependencyError.js');

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
		foo.register('service').value(service);
		expect(foo.get('service')).toBe(service);
	});

	it("register().factory(fn)", function() {
		var foo = diFactory('foo');
		var value = 123;
		var serviceCalled = 0;
		var service = function(fooValue, value) {
			serviceCalled += 1;
			return fooValue + value;
		};
		foo.register('value').value(value);
		foo.register('service').factory(service);

		// fetch service twice, only executed once, gets dependencies itself
		expect(serviceCalled).toBe(0);
		expect(foo.get('service')).toBe(value + value);
		expect(foo.get('service')).toBe(value + value);
		expect(serviceCalled).toBe(1);

		// error if no method provided
		foo.register('fail', function(error) {
			expect(error instanceof Error).toBe(true);
		}).factory(null);
	});

	it("register().get()", function() {
		var foo = diFactory('foo');
		var value = 123;
		var serviceCalled = 0;
		var service = function(fooValue, value) {
			serviceCalled += 1;
			return fooValue + value;
		};
		foo.register('value').value(value);
		var result = foo.register('service').factory(service).get();
		expect(serviceCalled).toBe(1);
		expect(result).toBe(value + value);
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
		bar.register('di').public();
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
		foo.register('di').public();
		expect(baz.get('fooDi')).toBe(foo);
	});

	it("import cache", function() {
		var a, b;
		var value = 1;
		var factory = sinon.stub().returns(value);
		var foo = diFactory('foo');
		var bar = foo.newChild('bar');

		// do not cache null
		foo.register('stu').value(undefined);
		expect(bar.get('cached')).toBe(null);

		// cache import result
		foo.register('cached').factory(factory).public();
		a = bar.get('cached');
		b = bar.get('cached');
		expect(a).toBe(value);
		expect(a).toBe(b);
		sinon.assert.calledOnce(factory);

		// import clears cache - but value remains correct
		bar.import(diFactory('new'));
		expect(bar.get('cached')).toBe(value);
	});

	it("allow /[a-z0-9]/i as injector and dependency name", function() {
		var di = diFactory('123f456{(]´äb');
		expect(di.diName).toBe('f456b');
		di.register('123g789{(]´äc').value('1');
		expect(di.require('g789c')).toBe('1');
		expect(di.require('f456bG789c')).toBe('1');
	});

	describe("expose error class", function() {
		expect(diFactory.DependencyInjectionError).toBeDefined();
		expect(diFactory.Error).toBeDefined();
		expect(diFactory.Error).toBe(diFactory.DependencyInjectionError);
		expect(diFactory.Error.COULD_NOT_REQUIRE).toBe(101);
		expect(diFactory.Error.NOT_A_FUNCTION).toBe(102);
		expect(diFactory.Error.DEPENDENCY_NOT_FOUND).toBe(103);
		expect(new diFactory.Error() instanceof Error).toBe(true);
	});

	describe("error handling", function() {
		var foo = diFactory('foo');
		var errback;
		var brokenFn = function(missingA, di, missingB) {};
		brokenFn.__di_filename = 'my/long/filename.js';

		it("di(false)", function() {
			// errback
			foo(false, false, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.NOT_A_FUNCTION);

			// without errback (throw)
			expect(function() {
				foo(false);
			}).toThrow();
		});

		it("di(function(missingDependency){})", function() {
			// errback
			foo(brokenFn, false, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.DEPENDENCY_NOT_FOUND);
			// put missing dependencies into the message
			expect(errback.getCall(0).args[0].message).toMatch(/"missingA, missingB"/);
			// put method context into the message
			expect(errback.getCall(0).args[0].message).toMatch(/function *\( *missingA, *di, *missingB *\)/);
			// put fn.__di_filename into the message
			expect(errback.getCall(0).args[0].message).toContain(brokenFn.__di_filename);

			// without errback (throw)
			expect(function() {
				foo(brokenFn);
			}).toThrow();
		});

		it("di.file()", function() {
			// errback
			foo.file(testfileFn, null, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.DEPENDENCY_NOT_FOUND);
			expect(errback.getCall(0).args[0].message).toContain(testfileFn);

			// without errback (throw)
			expect(function() {
				foo.file(testfileFn);
			}).toThrow();

			// missing file
			foo.file('some-non-existing-file', null, errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.COULD_NOT_REQUIRE);
		});

		it("di.require()", function() {
			// errback
			foo.require('unknown', errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.DEPENDENCY_NOT_FOUND);

			// without errback (throw)
			expect(function() {
				foo.require('unknown');
			}).toThrow();
		});

		it("di.register().factory()", function() {
			// errback
			foo.require('unknown', errback = sinon.spy());
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.DEPENDENCY_NOT_FOUND);

			// without errback (throw)
			expect(function() {
				foo.register('x').factory(false);
			}).toThrow();
		});

		it("di.callback(errback)", function() {
			// errback
			var cb = foo.callback(brokenFn, false, errback = sinon.spy());
			cb();
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);
			expect(errback.getCall(0).args[0].code).toBe(diFactory.Error.DEPENDENCY_NOT_FOUND);

			// without errback (throw)
			expect(function() {
				var cb = foo.callback(brokenFn);
				cb();
			}).toThrow();
		});

		it("di.register().file()", function() {
			foo.register('file', errback = sinon.spy()).file('$unknown');
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo.register('file').file('$unknown');
			}).toThrow();
		});

		it("di.register().file() - add filename to stack on error", function() {
			var onError = sinon.spy();
			foo.register('depa').file(testfileFn);
			foo.register('depb').file(testfileFnParts);
			foo.require('depa', onError);
			foo.require('depb', onError);
			// two errors - broken factory + missing dependency (times two)
			sinon.assert.callCount(onError, 4);
			// first error mentions file
			expect(onError.getCall(0).args[0].message).toContain(testfileFn);
			expect(onError.getCall(2).args[0].message).toContain(testfileFn);
		});

		it("di.register().file() - propagate stack from require error", function() {
			foo.register('file', errback = sinon.spy()).fileValue(testfileError);

			expect(errback.getCall(0).args[0].stack).toContain('thisMethodDoesNotExist is not defined');
			expect(errback.getCall(0).args[0].stack).toContain('dependencyError.js');
		});

		it("di.register().fileValue()", function() {
			foo.register('file', errback = sinon.spy()).fileValue('$unknown');
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo.register('file').fileValue('$unknown');
			}).toThrow();
		});

		it("di.register().fileFactory()", function() {
			foo.register('file', errback = sinon.spy()).fileFactory('$unknown');
			expect(errback.getCall(0).args[0] instanceof diFactory.Error).toBe(true);

			// without errback (throw)
			expect(function() {
				foo.register('file').fileFactory('$unknown');
			}).toThrow();
		});
	});

	it("file()", function() {
		var foo = diFactory('foo');

		expect(foo.file(testfileFn, { brokenDependency: 1 })).toBe(1);
		expect(foo.file(testfileFnParts, { brokenDependency: 2 })).toBe(2);

		// return null on missing file - and throw/onError Error
		expect(foo.file('missing-file', null, function(error) {
			expect(error instanceof diFactory.Error);
		})).toBe(null);

		// return null if fn is not a function - and throw/onError diFactory.Error
		expect(foo.file(testfileValue, null, function(error) {
			expect(error instanceof diFactory.Error);
		})).toBe(null);
	});

	it("register().file() - choose factory or value on contents", function() {
		var foo = diFactory('foo');
		foo.register('brokenDependency').value('injected value');
		foo.register('value').file(testfileValue);
		foo.register('factory').file(testfileFn);
		expect(foo.require('value')).toBe('dependency value');
		expect(foo.require('factory')).toBe('injected value');
	});

	it("register().fileValue()", function() {
		var foo = diFactory('foo');
		foo.register('file').fileValue(testfileFn);
		expect(foo.get('file')).toBe(require(testfileFn));
	});

	it("register().fileFactory()", function() {
		var foo = diFactory('foo');
		var onError = sinon.spy();
		foo.register('file').fileFactory(testfileFn);
		foo.require('file', onError);
		sinon.assert.called(onError);
		expect(onError.getCall(0).args[0].message).toContain('could not inject "brokenDependency"');
	});

	it("mapInvoke", function() {
		var foo = diFactory('foo');
		var bar = diFactory('bar');
		foo.register('value').value(1);
		bar.register('value').value(2);
		var result = diFactory.mapInvoke([foo, bar], function(value) {
			return value;
		});
		expect(result).toEqual([1, 2]);
	});

	it("showDependencies()", function() {
		sinon.stub(console, 'log');

		var foo = diFactory('afoo');
		foo.register('apriv').value(1);
		foo.register('apub').value(1).public();
		var bar = diFactory('bbar');
		bar.register('bpriv').value(1);
		bar.register('bpub').value(1).public();
		var baz = diFactory('cbaz');
		baz.register('cpriv').value(1);
		baz.register('cpub').value(1).public();

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