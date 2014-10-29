# di

Dependency Injection for node.js inspired by Angular.js

```
var di = require('di')();
di.register('value', 'my value');
di(function(value) {
	console.log(value); // stdout: 'my value'
});
```

## Why

Using dependency injection instead of require() in your project hugely improves and simplifies the ability to write unit tests.



## Features

* create multiple independent dependency injectors
* public / private dependencies
* import dependency injectors to access its public dependencies 
* 100% unit test coverage



## Api - Factory

### diFactory()

`diFactory( name:string [, imports:di|di[] ] ):di`

Create a new dependency injector. The name is used in error messages, import() and showDependencies().

#### Arguments

1. name {string}: Name of the dependency injector
2. [imports] {di|di[]}: Existing dependency injectors to import

#### Returns

{di}: a new dependency injector

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
var service = diFactory('service', [app]);
```



### mapInvoke()

`mapInvoke( dis:di[], fn:Function ):*[]`

Call `di.invoke(fn)` on every dependency injector inside `dis` and return array of results.

#### Arguments

1. dis {di[]}: Array of dependency injectors
2. fn {function}: Function to invoke

#### Returns

{*[]}: The return values of each `fn` invokation

#### Example

```
var diFactory = require('di');
var app1 = diFactory('app1');
var app2 = diFactory('app2');
app1.register('value', 'app 1 value');
app2.register('value', 'app 2 value');
var result = diFactory.mapInvoke([app1, app2], function(di, value) {
	return di.diName + ' :: ' + value;
});
console.log(result); // stdout: [ 'app1 :: app 1 value', 'app2 :: app 2 value' ]
```



## Api - Dependency Injector instance

### invoke()

`di.invoke( fn:function [, custom:object ] [, onError: function(error) ] )`

or

`di( fn:function [, custom:object ] [, onError: function(error) ] )`

Inject dependencies on `fn`.

#### Arguments

1. fn {function}: The function to inject the dependencies on
2. [custom] {object}: Provide custom dependencies
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

#### Returns

{*}: The return value of fn

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.register('value', 'my value');
function myMethod(value) {
	console.log(value);
}
app(myMethod); // stdout 'my value'
app.invoke(myMethod); // stdout 'my value'
```



### mapInvoke()

alias for `diFactory.mapInvoke`




### file()

`file( file:string [, custom:Object ] [, onError:function(err) ] ):*`

Does `require(file)` and calls `invoke()` if file returns a function. Adds `file` to error message on error.

#### Arguments

1. fn {function}: The function to inject the dependencies on
2. [custom] {object}: Provide custom dependencies
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

#### Returns

{*}: The return value of function from `file`

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.file('/my/function.js');
```




### callback()

`callback( fn:Function [, custom:Object ] [, onError:function(err) ] ):function`

Creates a function, that calls invoke() upon its execution.

#### Arguments

1. fn {function}: The function to inject the dependencies on
2. [custom] {object}: Provide custom dependencies
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

#### Returns

{function}: The callback function

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.register('value', 'my value');
var callback = app.callback(function myMethod(value) {
	console.log(value);
});
setTimeout(callback, 500); // stdout after 500ms: 'my value'
```



### register()

`register( name:string, value:* ):di`

Register a dependency.

#### Arguments

1. name {string}: Name of the dependency
2. value {*}: The value that is being returned 

#### Returns

{di}: self

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.register('value', 'my value');
app(function(value) {
	console.log(value); // stdout: 'my value'
});
```



### registerFactory()

`registerFactory( name:string, fn:function [, onError:function(err) ] ):di`

Register a function that becomes lazy invoked upon first retrieval. The return value of `fn` will be used as dependency value.

#### Arguments

1. name {string}: Name of the dependency
2. fn {function}: Factory function
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

#### Returns

{di}: self

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.register('value', 1);
app.register('logger', console.log.bind(console));
// a factory function is called once on first injection and can request dependencies itself
app.registerFactory('result', function(value) {
	return foo + 1;
});
app(function(logger, value, result) {
	logger(value, result); // stdout: 1, 2
});
```



### registerFile()

`registerFile( name:string, file:string [, onError:function(err) ] ):di`

Does `require(file)` and calls `registerFactory()` if file returns a function and `register()` otherwise. Adds `file` to error message on error.

#### Arguments

1. name {string}: Name of the dependency
2. file {string}: Absolute path/to/file to require()
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown

#### Returns

{di}: self

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.registerFile('value', '/my/value.js');
app(function(value) {
	console.log(value);
});
```



### setPublic()

`setPublic( name:string ):di`

Make a dependency visible if the dependency injector is being imported. 

#### Arguments

1. name {string}: Name of the dependency

#### Returns

{di}: self

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
var service = diFactory('service', [app]);
app.register('private', 'my private value');
app.register('public', 'my public value');
app.setPublic('public');
app.get('private'); // 'my private value'
app.get('public'); // 'my public value'
service.get('private'); // null - invisible for service, as dependency 'private' is not setPublic() in imported di
service.get('public'); // 'my public value'
```



### get()

`get( name:string [, publicOnly:boolean] [, onError:function(err) ] ):*|null`

Get a single dependency.

#### Arguments

1. name {string}: Name of the dependency
2. [publicOnly=false] {boolean}: Only look for dependencies that are `setPublic(name)`. Is true for every imported dependency injector
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown. An error can happen if `name` is a factory and this factory requests dependencies that do not exist. 

#### Returns

{*|null}: Dependency value or null if dependency was not found

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.register('value', 'my value');
app.registerFactory('myFactory', function(doesNotExist) {});
app.get('value'); // 'my value'
app.get('doesNotExist'); // null
app.get('myFactory'); // throws `new diFactory.Error` as 'myFactory' requests a dependency, that does not exist 
```


### require()

`require( name:string [, onError:function(err) ] ):*`

Get a single dependency. Throw an error if dependency is not available. 

#### Arguments

1. name {string}: Name of the dependency
3. [onError] {function(error)}: Error callback in case this methods triggers an error. If onError is missing, the error will be thrown 

#### Returns

{*}: Dependency value

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
app.get('value'); // throws `new diFactory.Error` as 'value' does not exist 
```



### import()

`import( imports:di|di[] ):di`

Import one or many existing dependency injectors. 

#### Arguments

1. imports {di|di[]}: Dependency injector(s)

#### Returns

{di}: self


#### Example

```
var diFactory = require('di');
var app = diFactory('app');
var service = diFactory('service');
app.register('public', 'my public value');
app.setPublic('public');
service.import(app);
service.get('public'); // 'my public value'
```



### newChild()

`newChild( name:string [, imports:di|di[] ] ):di`

Create a new dependency injector and add self & self.imports as imports of the new instance. 

#### Arguments

1. name {string}: Name of the dependency injector
2. [imports] {di|di[]}: Existing dependency injectors to import

#### Returns

{di}: a new dependency injector

#### Example

```
var diFactory = require('di');
var app = diFactory('app');
var service = app.newChild('service');
app.register('public', 'my public value');
app.setPublic('public');
service.get('public'); // 'my public value'
```



### showDependencies()

`showDependencies( [ fn:function(output) ] [, inherited:boolean ] [, processed:Object ] )`

List all private and public dependencies of dependency injector and all public ones from the imported injectors.

#### Arguments

1. [fn] {function(output)=console.log}: returns output to `fn`. If `fn` is missing, the output is being printed to console.log
2. [inherited] {boolean=false}: used internally for recursion
3. [processed] {object}: used internally to prevent circular recursion  

#### Returns

{undefined}


## Prefix by dependency injector name

You can target a specific dependency injector by prefixing the dependency

```
var diFactory = require('di');
var app = diFactory('app');
var service = app.newChild('service');
app.register('value', 'my app value');
app.setPublic('value');
service.register('value', 'my service value');
service(function(value, appValue, serviceValue) {
	console.log(value); // 'my service value'
	console.log(appValue); // 'my app value'
	console.log(serviceValue); // 'my service value'
});
```


## Fetch dependency injector itself

Every dependency injector adds itself as "di" and "[name]di"

```
var diFactory = require('di');
var app = diFactory('app');
app(function(di) {
	console.log(di === app); // stdout: true
});
```

## Everything is case insensitive

Every dependency is case insensitive. Uppercase letters can be used for readability.

```
var diFactory = require('di');
var app = diFactory('aPP');
app.register('valUE', 'my app value');
service(function(valUE, aPPvalUE, value, appValue, appvalue) {
	console.log(valUE);    // stdout: 'my app value'
	console.log(aPPvalUE); // stdout: 'my app value'
	console.log(value);    // stdout: 'my app value'
	console.log(appValue); // stdout: 'my app value'
	console.log(appvalue); // stdout: 'my app value'
});
```
