# Error Handling

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
