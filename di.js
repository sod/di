/**
 * Dependency Injection
 *
 * Usage:
 * var di = require('di.js')()
 * di.register('foo', 1);
 * di.register('log', console.log.bind(console));
 *
 * // a factory function is called once on first injection and can request dependencies itself
 * di.registerFactory('bar', function(foo) {
 *	return foo + 1;
 * });
 *
 * di(function(log, foo, bar) {
 *	log([foo, bar]); // [ 1, 2 ]
 * });
 */

var getParameterNames = require('get-parameter-names');
var _ = require('lodash');

var factoryKey = '__di_factory';
var fileKey = '_filename';

function getMissingDependencies(args, dependencies) {
	return _.remove(_.map(args, function(value, index) {
		return dependencies[index] === null ? value : null;
	})).join(', ');
}

/**
 * @param {string} name - accessible via `.diName` and be able to request a specific
 *      service from a parent di by using this prefix like di(function(prefixService) {});
 * @param {di|di[]} [imports] - parent di to lock for, if dependency was not found in this one
 * @returns {di}
 */
function diFactory(name, imports) {
	// public and private dependencies - key is lowercase: { name: value } and { <di-name>name: value }
	var _registers = {};

	// imported di instances
	var _imports = [];

	// once a dependency was found in an import, { name: value } is saved here ... is being cleared on .import()
	var _importCache = {};

	// public dependency names - key is lowercase: { name: true } and { <di-name>name: true }
	var _public = {};

	// public and private dependency names for .showDependencies() - key is lowercase: { name: true }
	var _names = {};

	function $throw(error) {
		throw error;
	}

	/**
	 * dependency inject on fn
	 * @name di
	 * @throws Error if fn is not a function
	 * @throws Error if at least one dependency is missing
	 * @param {function} fn
	 * @param {object} [custom] overwrite injections with custom values
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @returns {*}
	 */
	function di(fn, custom, onError) {
		var args, injections;

		if(typeof fn !== 'function') {
			return (typeof onError === 'function' ? onError : $throw)(new diFactory.Error(di.diName, 'fn must be typeof function'));
		}

		args = getParameterNames(fn);
		injections = custom ? args.map(function(arg) {
			// allow every custom value besides null (change null => undefined)
			return custom.hasOwnProperty(arg) ? (custom[arg] === null ? undefined : custom[arg]) : di.get(arg);
		}) : args.map(di.get);

		if(injections.indexOf(null) !== -1) {
			return (typeof onError === 'function' ? onError : $throw)(new diFactory.Error(di.diName, 'could not inject "' + getMissingDependencies(args, injections) + '" (either missing or not setPublic() if imported)', fn));
		}

		return fn.apply(fn, injections);
	}

	/**
	 * alias
	 * @type {di}
	 */
	di.invoke = di;

	/**
	 * alias
	 */
	di.mapInvoke = diFactory.mapInvoke;

	/**
	 * dependency inject on file if module.exports is function
	 * @name di
	 * @throws Error if fn is not a function
	 * @throws Error if at least one dependency is missing
	 * @param {string} file
	 * @param {object} [custom] overwrite injections with custom values
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @returns {*}
	 */
	di.file = function(file, custom, onError) {
		var fn = require(file);
		if(typeof fn === 'function') {
			fn[fileKey] = file;
			return di(fn, custom, onError);
		}
		return null;
	};

	/**
	 * @param {di|di[]} imports
	 * @returns {di}
	 */
	di.import = function(imports) {
		_.each([].concat(imports), function(d) {
			if(d && d.diName && _imports.indexOf(d) === -1 && d !== di) {
				_imports.push(d);
				_importCache = {};
			}
		});
		return di;
	};

	/**
	 * make dependency available on import
	 * @param {string} name
	 * @returns {di}
	 */
	di.setPublic = function(name) {
		var key = name.toLowerCase();
		_public[key] = _public[di.diName + key] = true;
		return di;
	};

	/**
	 * print dependencies to console.log or fn (if provided)
	 * @param {function(output)} [fn]
	 * @param {boolean} [inherited=false] - only show public
	 * @param {object} [processed] - already processed di names
	 */
	di.showDependencies = function(fn, inherited, processed) {
		var indent = function(str) { return '      ' + str; }
		var add = function(str) { str && lines.push(str); }
		var lines = [];

		processed = processed || {};
		if(processed.hasOwnProperty(di.diName)) {
			return;
		}
		processed[di.diName] = true;

		if(!inherited) {
			lines.push('Dependency Injector: ' + di.diName, '');
		}

		lines.push('  ' + di.diName + (inherited ? ' (inherited)' : ''));
		lines = lines.concat('    public', _.intersection(_.keys(_names), _.keys(_public)).map(indent));

		if(!inherited) {
			lines = lines.concat('    private', _.difference(_.keys(_names), _.keys(_public)).map(indent));
		}

		_.invoke(_imports, 'showDependencies', add, true, processed);

		;(fn || console.log)(lines.join('\n') + (inherited ? '' : '\n'));
	};

	/**
	 * @throws Error if name is a factory and factory does not find a dependency
	 * @param {string} name
	 * @param {boolean} [publicOnly]
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @returns {*|null}
	 */
	di.get = function(name, publicOnly, onError) {
		var index, dependency, key = name.toLowerCase();

		if(_registers.hasOwnProperty(key) && (publicOnly !== true || _public[key])) {
			if(_registers[key] && _registers[key][factoryKey]) {
				_registers[key] = _registers[key]({ __di_onError: onError });
			}
			return _registers[key];
		}

		if(_importCache.hasOwnProperty(key)) {
			return _importCache[key];
		}

		for(index = 0; index < _imports.length; index += 1) {
			if((dependency = _imports[index].get(key, true, onError)) !== null) {
				return _importCache[key] = dependency;
			}
		}

		return null;
	};

	/**
	 * same as get(), but throws an error, if name could not become resolved
	 * @throws Error if dependency was not found
	 * @param {string} name
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
 	 * @returns {*}
	 */
	di.require = function(name, onError) {
		var dependency;
		if((dependency = di.get(name, null, onError)) === null) {
			return (typeof onError === 'function' ? onError : $throw)(new diFactory.Error(di.diName, '"' + name + '" required, but not registered'));
		}

		return dependency;
	};

	/**
	 * register a namespace
	 * @param {string} name
	 * @param {*} mixed
	 * @returns {di}
	 */
	di.register = function(name, mixed) {
		var key = name.toLowerCase();
		_registers[key] = _registers[di.diName + key] = mixed;
		_names[key] = true;
		return di;
	};

	/**
	 * register a namespace, that becomes dependencies injected itself and is executed once on first request
	 * @throws Error if fn is not a function
	 * @param {string} name
	 * @param {function} fn
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @returns {di}
	 */
	di.registerFactory = function(name, fn, onError) {
		if(typeof fn !== 'function') {
			return (typeof onError === 'function' ? onError : $throw)(new diFactory.Error(di.diName, '"' + name + '" was defined as factory but is not typeof function'));
		}

		var callback = di.callback(fn);
		callback[factoryKey] = true;
		di.register(name, callback);
		return di;
	};

	/**
	 * require file and registerFactory() if module.exports is function, otherwise register()
	 * @param {string} name
	 * @param {string} file
	 * @param {function(err)} [onError]
	 * @returns {di}
	 */
	di.registerFile = function(name, file, onError) {
		var method = 'register';
		var contents = require(file);
		if(typeof contents === 'function') {
			method = 'registerFactory';
			contents[fileKey] = file;
		}
		di[method](name, contents, onError);
		return di;
	};

	/**
	 * @param {string} name
	 * @param {di|di[]} [imports]
	 * @returns {di}
	 */
	di.newChild = function(name, imports) {
		return diFactory(name, [di].concat(imports || []));
	};

	/**
	 * @returns {string[]}
	 */
	di.getImportNames = function() {
		return _.map(imports, function(d) {
			return d.diName;
		});
	};

	/**
	 * returns a callback that does not execute fn immediately
	 * @param {function} fn
	 * @param {object} [custom]
	 * @param {function(err)} [onError]
	 * @returns {Function}
	 */
	di.callback = function(fn, custom, onError) {
		/**
		 * @param {object} [opt]
		 * @param {function(err)} [opt.__di_onError] - internal pass error handler on lazy loading
		 */
		return function() {
			return di.invoke(fn, custom, (arguments[0] && arguments[0].__di_onError) || onError);
		};
	};

	di.diName = String(name).replace(/[^a-z]+/ig, '').toLowerCase();
	di.import(imports);
	return di.register('di', di);
}

/**
 * invoke fn with each di in "dis" and return array of results
 * @param {di[]} dis
 * @param {function} fn
 * @returns {*[]}
 */
diFactory.mapInvoke = function(dis, fn) {
	return _.invoke(dis, 'invoke', fn);
};

/**
 * @name DependencyInjectionError
 */
diFactory.Error = diFactory.DependencyInjectionError = (function() {
	/**
	 * @param {string} name
	 * @param {string} message
	 * @param {function} [context]
	 * @param {string} [context._filename]
	 * @constructor
	 */
	function DependencyInjectionError(name, message, context) {
		this.name = 'DependencyInjectionError';
		this.message = 'di.js: ' + message + ' (di: ' + name + ')';
		this.message += context && context._filename ? '\n    at file (' + context._filename + ':1:0)' : '';
		this.message += context ? [].concat('', '... context ...', context.toString().split('\n').splice(0, 5), '...', '').join('\n') : '';
		Error.captureStackTrace && Error.captureStackTrace(this, DependencyInjectionError);
	};

	DependencyInjectionError.prototype = new Error();
	DependencyInjectionError.prototype.constructor = DependencyInjectionError;
	DependencyInjectionError.prototype.name = 'DependencyInjectionError';

	return DependencyInjectionError;
}());

module.exports = diFactory;