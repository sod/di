# Error Messages

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

