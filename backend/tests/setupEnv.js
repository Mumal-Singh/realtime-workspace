const { TEST_DATABASE_URL } = require('./testEnv');
// safety: tests TRUNCATE tables, so never let them touch a non-test database
if (!TEST_DATABASE_URL.includes('test')) {
  throw new Error('Refusing to run tests against a non-test database');
}
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.NODE_ENV = 'test';
