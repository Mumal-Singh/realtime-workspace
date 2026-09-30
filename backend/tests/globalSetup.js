const { execSync } = require('child_process');
const { TEST_DATABASE_URL } = require('./testEnv');

module.exports = async () => {
  // applies the real migrations from prisma/migrations to the test db
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
};
