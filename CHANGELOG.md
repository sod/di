# 1.1.3 (2014-11-02)

## Changes

- Add one of three error codes as `{Number} error.code` to each error. Constants: diFactory.Error.(COULD_NOT_REQUIRE|NOT_A_FUNCTION|DEPENDENCY_NOT_FOUND)

# 1.1.2 (2014-11-02)

## Changes

- Fix di.file() error behavior - now passes every error to {function} onError