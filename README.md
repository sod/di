# sod-di

Dependency Injection for node.js

## Install

```sh
npm install sod-di
```

## Documentation

* **[API Documentation](doc/api.md)**
* **[Error Messages](doc/error-messages.md)**
* **[Error Handling](doc/error-handling.md)**

## Example

```javascript
var di = new require('sod-di')('MyDependencies');

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
