# Unit Test Example

Run: `node index.js`
Output: `3.141592653589793`

Run: `node test/implementation.js`
Output: `TESTS PASSED`

Both, the test and the implementation, don't know anything about `logger` 
or where it comes from. If the logger changes, test
and implementation won't break.