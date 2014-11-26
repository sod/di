# di

Dependency Injection for node.js inspired by Angular.js

## Install

```javascript
npm install sod-di
```

## Example

```javascript
di.register('pi').value(Math.PI);
di.register('logger').value(console);
di.register('area').factory(function(pi) {
	return function(radius) {
		return radius * radius * pi;
	};
});
di(function(logger, area) {
	logger.log(area(2)); // stdout: 12.566370614359172
});
```


## Why

Using dependency injection instead of require() in your project hugely improves and simplifies the ability to write unit tests.


## Features

* create multiple independent dependency injectors
* public / private dependencies
* import dependency injectors to access its public dependencies
* useful error handling
* 100% unit test coverage



## Api

### Table of Contents

#### Factory

* **[diFactory()](#difactory)**
* **[mapInvoke()](#mapinvoke)**

#### Dependency injector instance

* **[invoke()](#invoke)**
* **[file()](#file)**
* **[callback()](#callback)**
* **[register()](#register)**
* **[get()](#get)**
* **[require()](#require)**
* **[import()](#import)**
* **[newChild()](#newchild)**
* **[showDependencies()](#showdependencies)**

#### Dependency

* **[value()](#value)**
* **[factory()](#factory-2)**
* **[file()](#file)**
* **[fileValue()](#filevalue)**
* **[fileFactory()](#filefactory)**
* **[public()](#public)**

#### Appendix

* **[Prefix by dependency injector name](#prefix-by-dependency-injector-name)**
* **[Fetch dependency injector instance](#fetch-dependency-injector-instance)**
* **[Everything is case insensitive](#everything-is-case-insensitive)**
* **[Error Messages](#error-messages)**
* **[Error Handling](#error-handling)**

### Factory

#### diFactory()

`diFactory( name:string [, imports:di|di[] ] ):di`

Create a new dependency injector. The name is used in error messages, import() and showDependencies().

##### Arguments

1. `name {string}`: Name of the dependency injector
2. `[imports] {di|di[]}`: Existing dependency injectors to import

##### Returns

`{di}`: a new dependency injector

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
var service = diFactory('service', [app]);
```



#### mapInvoke()

`mapInvoke( dis:di[], fn:Function ):*[]`

Call `di.invoke(fn)` on every dependency injector inside `dis` and return array of results.

##### Arguments

1. `dis {di[]}`: Array of dependency injectors
2. `fn {function}`: Function to invoke

##### Returns

`{*[]}`: The return values of each `fn` invokation

##### Example

```javascript
var diFactory = require('sod-di');
var app1 = diFactory('app1');
var app2 = diFactory('app2');
app1.register('value').value('app 1 value');
app2.register('value').value('app 2 value');
var result = diFactory.mapInvoke([app1, app2], function(di, value) {
	return di.diName + ' :: ' + value;
});
console.log(result); // stdout: [ 'app1 :: app 1 value', 'app2 :: app 2 value' ]
```



### Dependency injector instance

#### invoke()

`di.invoke( fn:function [, custom:object ] [, onError: function(error) ] )`

or

`di( fn:function [, custom:object ] [, onError: function(error) ] )`

Inject dependencies on `fn`.

##### Arguments

1. `fn {function}`: The function to inject the dependencies on
2. `[custom] {object}`: Provide custom dependencies
3. `[onError] {function(error)}`: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

##### Returns

`{*}`: The return value of fn

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value('my value');
function myMethod(value) {
	console.log(value);
}
app(myMethod); // stdout: 'my value'
app.invoke(myMethod); // stdout: 'my value'
app(myMethod, { value: 'custom value' }); // stdout: 'custom value'
```




#### file()

`file( file:string|string[] [, custom:Object ] [, onError:function(err) ] ):*`

Does `require(file)` and calls `invoke()` if file returns a function. Adds `file` to error message on error.

##### Arguments

1. `file {string|string[]}`: Absolute path/to/file to require(). If file === string[], then file() adds the paths together with `path.join(...file)`
2. `[custom] {object}`: Provide custom dependencies
3. `[onError] {function(error)}`: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

##### Returns

`{*}`: The return value of function from `file`

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.file('/my/function.js');
```




#### callback()

`callback( fn:Function [, custom:Object ] [, onError:function(err) ] ):function`

Creates a function, that calls invoke() upon its execution.

##### Arguments

1. `fn {function}`: The function to inject the dependencies on
2. `[custom] {object}`: Provide custom dependencies
3. `[onError] {function(error)}`: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

##### Returns

`{function}`: The callback function

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value('my value');
var callback = app.callback(function(value) {
	console.log(value);
});
setTimeout(callback, 500); // stdout after 500ms: 'my value'
```



#### register()

`register( name:string [, onError:function(err) ] ):Dependency`

Register a dependency.

##### Arguments

1. `name {string}`: Name of the dependency
2. `[onError] {function(error)}`: Error callback in case an error triggers in the register chain. If onError is missing, the error will be thrown

##### Returns

`{Dependency}`: Chainable instance of **[Dependency](#dependency-1)** to modify dependency value

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value('my value');
app(function(value) {
	console.log(value); // stdout: 'my value'
});

// error handling
app.register('value', function(error) {
	console.log(error); // COULD_NOT_REQUIRE error
}).file('this/file/does/not/exist');
```



#### get()

`get( name:string [, publicOnly:boolean] [, onError:function(err) ] ):*|null`

Get a single dependency.

##### Arguments

1. `name {string}`: Name of the dependency
2. `[publicOnly=false] {boolean}`: Only look for dependencies that are `setPublic(name)`. Is true for every imported dependency injector
3. `[onError] {function(error)}`: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown. An error can happen if `name` is a factory and this factory requests dependencies that do not exist. 

##### Returns

`{*|null}`: Dependency value or null if dependency was not found

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value('my value');
app.register('myFactory').factory(function(doesNotExist) {});
app.get('value'); // 'my value'
app.get('doesNotExist'); // null
app.get('myFactory'); // throws `new diFactory.Error` as 'myFactory' requests a dependency, that does not exist 
```


#### require()

`require( name:string [, onError:function(err) ] ):*`

Get a single dependency. Throw an error if dependency is not available. 

##### Arguments

1. `name {string}`: Name of the dependency
3. `[onError] {function(error)}`: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown 

##### Returns

`{*}`: Dependency value

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.require('value'); // throws `new diFactory.Error` as 'value' does not exist 
```



#### import()

`import( imports:di|di[] ):di`

Import one or many existing dependency injectors. 

##### Arguments

1. `imports {di|di[]}`: Dependency injector(s)

##### Returns

`{di}`: self


##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
var service = diFactory('service');
app.register('public').value('my public value').public();
service.import(app);
service.get('public'); // 'my public value'
```



#### newChild()

`newChild( name:string [, imports:di|di[] ] ):di`

Create a new dependency injector and add self & self.imports as imports of the new instance. 

##### Arguments

1. `name {string}`: Name of the dependency injector
2. `[imports] {di|di[]}`: Existing dependency injectors to import

##### Returns

`{di}`: a new dependency injector

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
var service = app.newChild('service');
app.register('public').value('my public value').public();
service.get('public'); // 'my public value'
```



#### showDependencies()

`showDependencies( [ fn:function(output) ] [, inherited:boolean ] [, processed:Object ] )`

List all private and public dependencies of dependency injector and all public ones from the imported injectors.

##### Arguments

1. `[fn] {function(output)=console.log}`: returns output to `fn`. If `fn` is missing, the output is being printed to console.log
2. `[inherited] {boolean=false}`: used internally for recursion
3. `[processed] {object}`: used internally to prevent circular recursion  

##### Returns

`{undefined}`



### Dependency

You receive the chainable dependency object by calling **[register()](#register)**


#### value()

`value( value:* ):Dependency`

Register a value.

##### Arguments

1. `value {*}`

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value(1);
app.register('logger').value(console.log.bind(console));
app(function(logger, value) {
	logger(value); // stdout: 1
});
```



#### factory()

`factory( fn:function ):Dependency`

Register a function that becomes lazy invoked upon first retrieval. The return value of `fn` will be used as dependency value.

##### Arguments

1. `fn {function}`: Factory function

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').value(1);
app.register('logger').value(console.log.bind(console));
// a factory function is called once on first injection and can request dependencies itself
app.register('result').factory(function(value) {
	return value + 1;
});
app(function(logger, value, result) {
	logger(value, result); // stdout: 1, 2
});
```



#### file()

`file( file:string|string[] ):di`

Does `require(file)` and calls `factory()` if file returns a function and `value()` otherwise. Adds `file` to error message on error.

##### Arguments

1. `file {string|string[]}`: Absolute path/to/file. If file === string[], then file() adds the paths together with `path.join(...file)`

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').file('/my/value.js');
app(function(value) {
	console.log(value);
});
```



#### fileValue()

`fileValue( file:string|string[] ):di`

Does `require(file)` and calls `value()`. Shows filename in error message on error.

##### Arguments

1. `file {string|string[]}`: Absolute path/to/file. If file === string[], then file() adds the paths together with `path.join(...file)`

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('value').fileValue('/my/value.js');
```



#### fileFactory()

`fileFactory( file:string|string[] ):di`

Does `require(file)` and calls `factory()`. Shows filename in error message on error.

##### Arguments

1. `file {string|string[]}`: Absolute path/to/file. If file === string[], then file() adds the paths together with `path.join(...file)`

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app.register('factory').fileFactory('/my/factory.js');
```




#### public()

`public(  ):Dependency`

Set the dependency to public. This value will we visible if its being requested as imported dependency injector.

##### Arguments

none

##### Returns

`{Dependency}`: self

##### Example

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
var service = app.newChild('service');
app.register('public').value('my public value').public();
service.get('public'); // 'my public value'
```



## Prefix by dependency injector name

You can target a specific dependency injector by prefixing the dependency

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
var service = app.newChild('service');
app.register('value').value('my app value').public();
service.register('value').value('my service value');
service(function(value, appValue, serviceValue) {
	console.log(value); // 'my service value'
	console.log(appValue); // 'my app value'
	console.log(serviceValue); // 'my service value'
});
```


## Fetch dependency injector instance

Every dependency injector adds itself as "di" and "[name]di"

```javascript
var diFactory = require('sod-di');
var app = diFactory('app');
app(function(di) {
	console.log(di === app); // stdout: true
});
```

## Everything is case insensitive

Every dependency is case insensitive. Uppercase letters may be used for readability.

```javascript
var diFactory = require('sod-di');
var app = diFactory('aPP');
app.register('valUE').value('my app value');
service(function(valUE, aPPvalUE, value, appValue, appvalue) {
	console.log(valUE);    // stdout: 'my app value'
	console.log(aPPvalUE); // stdout: 'my app value'
	console.log(value);    // stdout: 'my app value'
	console.log(appValue); // stdout: 'my app value'
	console.log(appvalue); // stdout: 'my app value'
});
```

## Error Messages

### invoke()

Missing dependencies are added to the error message.

```javascript
var diFactory = require('./di.js');
var di = diFactory('app');
di.register('value').value(1);
di(function(test, value, dep) {});
```

#### Message

```
DependencyInjectionError: could not inject "test, dep" (either missing or not setPublic() if imported) (di: app)
... context ...
function (test, value, dep) {}
...
```


### file()

If you register dependencies with `register('name').file('file.js')` and invoke with `file('file.js')`, the error message includes the filename.

```
// 'my/file.js'
module.exports = function (test, value, dep) {}
```

```
var diFactory = require('./di.js');
var di = diFactory('app');
di.register('value').value(1);
di.file('my/file.js');
```

#### Message

```
DependencyInjectionError: could not inject "test, dep" (either missing or not setPublic() if imported) (di: app)
    at file (my/file.js:1:0)
... context ...
function (test, value, dep) {}
...
```


### require()

```javascript
var di = diFactory('app');
di.require('test');
```

#### Message

```
DependencyInjectionError: "test" required, but not registered (di: app)
```

## Error Handling

You can catch errors by `error.code`. Available codes are:

* `diFactory.Error.COULD_NOT_REQUIRE` - exception while `require(filename)` in `file(filename)` or `register().file(filename)`
* `diFactory.Error.NOT_A_FUNCTION` - exception while `fn()` in `register().factory(fn)` or `invoke(fn)`
* `diFactory.Error.DEPENDENCY_NOT_FOUND` - exception in `invoke(fn)` or `require(name)`

### Example

```javascript
var di = diFactory('app');
di.file('/my/file.js', null, function(error) {
	if(error.code === diFactory.Error.COULD_NOT_REQUIRE) {
		// just emit a warning if require failed, but keep the process alive
		logger.warn(error.message);
		return; 
	}
	
	// throw every other error
	throw error;
});
```



## Run tests

```bash
npm install
npm test
```

## Create code coverage "di-cov.html"

```bash
npm install
npm run-script test-cover
```