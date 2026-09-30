module.exports = {
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5432/workspace_test',
};
