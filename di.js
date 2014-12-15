var path = require('path');
var _ = require('lodash');
var getParameterNames = require('get-parameter-names');

var factoryKey = '__di_factory';
var fileKey = '__di_filename';
var limitCharacters = /[^a-z0-9]+/ig;
var appendedNumbers = /^[0-9]+/;

/**
 * @param {string[]} args
 * @param {object} dependencies
 * @returns {string}
 */
function getMissingDependencies(args, dependencies) {
	return _.remove(_.map(args, function(value, index) {
		return dependencies[index] === null ? value : null;
	})).join(', ');
}

/**
 * @param {function} [errorHandler]
 * @param {diFactory.Error|DiError} error
 * @throws
 */
function handleError(errorHandler, error) {
	if(typeof errorHandler !== 'function') {
		throw error;
	}
	errorHandler(error);
}

/**
 * @param {string|string[]} file
 * @param {function} onError
 * @param {string} diName
 * @returns {*}
 * @private
 */
function getFileContents(file, onError, diName) {
	var contents;
	file = _.isArray(file) ? path.join.apply(path, file) : file;
	try {
		contents = require(file);
		typeof contents === 'function' && Object.defineProperty(contents, fileKey, {
			enumerable: false,
			value: file
		});
		return contents;
	} catch(error) {
		handleError(onError, new DiError(DiError.COULD_NOT_REQUIRE, diName, 'Could not require file', null, error));
		return null;
	}
}

/**
 * @param {string} name - accessible via `.diName` and be able to request a specific
 *      service from a parent di by using this prefix like di(function(prefixService) {});
 * @param {di|di[]} [imports] - parent di to lock for, if dependency was not found in this one
 * @returns {di}
 */
function diFactory(name, imports) {
	// sanitized injector name in lowercase
	var diName = String(name).replace(limitCharacters, '').replace(appendedNumbers, '').toLowerCase();

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
			handleError(onError, new DiError(DiError.NOT_A_FUNCTION, diName, 'fn must be typeof function'));
			return null;
		}

		args = getParameterNames(fn);
		injections = custom ? args.map(function(arg) {
			// allow every custom value besides null (change null => undefined)
			return custom.hasOwnProperty(arg) ? (custom[arg] === null ? undefined : custom[arg]) : di.get(arg);
		}) : args.map(di.get);

		if(injections.indexOf(null) !== -1) {
			handleError(onError, new DiError(DiError.DEPENDENCY_NOT_FOUND, diName, 'could not inject "' + getMissingDependencies(args, injections) + '" (either missing or not setPublic() if imported)', fn));
			return null;
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
	di.diFactory = diFactory;

	/**
	 * dependency inject on file if module.exports is function
	 * @name di
	 * @throws Error if fn is not a function
	 * @throws Error if at least one dependency is missing
	 * @param {string|string[]} file - if file === string[], then path.join(file)
	 * @param {object} [custom] overwrite injections with custom values
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @returns {*}
	 */
	di.file = function(file, custom, onError) {
		var fn;
		if((fn = getFileContents(file, onError, diName)) === null) {
			return null;
		}
		if(typeof fn !== 'function') {
			handleError(onError, new DiError(DiError.NOT_A_FUNCTION, diName, 'require("' + file + '") did not return a function'));
			return null;
		}
		return di(fn, custom, onError);
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
		if(processed.hasOwnProperty(diName)) {
			return;
		}
		processed[diName] = true;

		if(!inherited) {
			lines.push('Dependency Injector: ' + diName, '');
		}

		lines.push('  ' + diName + (inherited ? ' (inherited)' : ''));
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
			handleError(onError, new DiError(DiError.DEPENDENCY_NOT_FOUND, diName, '"' + name + '" required, but not registered'));
			return null;
		}

		return dependency;
	};

	/**
	 * @param {string} name
	 * @param {function(err)} [onError] - callback to catch errors, if no callback is provided,
	 *      this method throws on error on error
	 * @constructor
	 */
	function Dependency(name, onError) {
		this.di = di;
		this.name = String(name).replace(limitCharacters, '').replace(appendedNumbers, '').toLowerCase();
		this.onError = onError;
	}

	/**
	 * set dependency public
	 * @returns {Dependency}
	 */
	Dependency.prototype.public = function() {
		_public[this.name] = _public[diName + this.name] = true;
		return this;
	};

	/**
	 * @param {*} value
	 * @returns {Dependency}
	 */
	Dependency.prototype.value = function(value) {
		_registers[this.name] = _registers[diName + this.name] = value;
		_names[this.name] = true;
		return this;
	};

	/**
	 * register a namespace, that becomes dependency injected itself and is executed once on first request
	 * @throws Error if fn is not a function
	 * @param {function} fn
	 * @returns {Dependency}
	 */
	Dependency.prototype.factory = function(fn) {
		if(typeof fn !== 'function') {
			handleError(this.onError, new DiError(DiError.NOT_A_FUNCTION, diName, '"' + name + '" was defined as factory but is not typeof function'));
			return this;
		}

		var callback = di.callback(fn);
		callback[factoryKey] = true;
		this.value(callback);
		return this;
	};

	/**
	 * require file and this.factory() if module.exports is function, otherwise this.value()
	 * @param {string|string[]} file - if file === string[], then path.join(file)
	 * @returns {Dependency}
	 */
	Dependency.prototype.file = function(file) {
		var contents;
		if((contents = getFileContents(file, this.onError, diName)) !== null) {
			this[typeof contents === 'function' ? 'factory' : 'value'](contents);
		}
		return this;
	};

	/**
	 * require file and this.value() its contents
	 * @param {string|string[]} file - if file === string[], then path.join(file)
	 * @returns {Dependency}
	 */
	Dependency.prototype.fileValue = function(file) {
		var contents;
		if((contents = getFileContents(file, this.onError, diName)) !== null) {
			this.value(contents);
		}
		return this;
	};

	/**
	 * require file and this.factory() its contents
	 * @param {string|string[]} file - if file === string[], then path.join(file)
	 * @returns {Dependency}
	 */
	Dependency.prototype.fileFactory = function(file) {
		var contents;
		if((contents = getFileContents(file, this.onError, diName)) !== null) {
			this.factory(contents);
		}
		return this;
	};

	/**
	 * register a namespace
	 * @param {string} name
	 * @param {function} [onError]
	 * @returns {Dependency}
	 */
	di.register = function(name, onError) {
		return new Dependency(name, onError);
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

	di.diName = diName;
	di.import(imports);
	di.register('di').value(di);
	return di;
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
var DiError = diFactory.Error = diFactory.DependencyInjectionError = (function() {
	/**
	 * @param {number} code
	 * @param {string} name
	 * @param {string} message
	 * @param {function} [context]
	 * @param {string} [context.__di_filename]
	 * @param {Error} [error] inherit stack from existing error
	 * @constructor
	 */
	function DependencyInjectionError(code, name, message, context, error) {
		this.code = code;
		this.message = this.name + ': ' + message + ' (di: ' + name + ')';
		this.message += context && context[fileKey] ? '\n    at file (' + context[fileKey] + ':1:0)' : '';
		this.message += context ? [].concat('', '... context ...', context.toString().split('\n').splice(0, 5), '...', '').join('\n') : '';
		if(error instanceof Error) {
			this.stack = this.message + '\n' + error.stack;
		} else if(Error.captureStackTrace) {
			Error.captureStackTrace(this, DependencyInjectionError);
		}
	}

	DependencyInjectionError.prototype = new Error();
	DependencyInjectionError.prototype.constructor = DependencyInjectionError;
	DependencyInjectionError.prototype.name = 'DependencyInjectionError';

	DependencyInjectionError.COULD_NOT_REQUIRE = 101;
	DependencyInjectionError.NOT_A_FUNCTION = 102;
	DependencyInjectionError.DEPENDENCY_NOT_FOUND = 103;

	return DependencyInjectionError;
}());

module.exports = diFactory;