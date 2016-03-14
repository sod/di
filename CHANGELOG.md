# 1.2.5 (2016-03-14)

## Changes

- [npm] update lodash to ^4.6.1

# 1.2.4 (2016-03-14)

## Changes

- [fix] stack wasn't propagated on error on newer node.js versions
- [chore] remove unused and undocumented `lazy` argument in `fileFactory(file, lazy)`

# 1.2.3 (2014-12-15)

## Changes

- fix jsdoc return value on `.register()` for code completion in WebStorm
- add new method `register().get()` for immediate factory invocation

# 1.2.2 (2014-12-05)

## Changes

- propagate original stack on require error

# 1.2.1 (2014-11-28)

## Changes

- allow numbers in injector and dependency names

# 1.2.0 (2014-11-26)

## Changes

- add api `register().fileValue()`
- add api `register().fileFactory()`
- pass errors to onError if `require()` throws while `register('key', onError).[file|fileValue|fileFactory]()`
- set `enumerable: false` on internal file property for error handling

# 1.1.3 (2014-11-02)

## Changes

- Add one of three error codes as `{Number} error.code` to each error. Constants: diFactory.Error.(COULD_NOT_REQUIRE|NOT_A_FUNCTION|DEPENDENCY_NOT_FOUND)

# 1.1.2 (2014-11-02)

## Changes

- Fix di.file() error behavior - now passes every error to {function} onError
