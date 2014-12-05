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