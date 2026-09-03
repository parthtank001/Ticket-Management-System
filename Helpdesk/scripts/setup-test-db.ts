import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

const envTestPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envTestPath });

export async function setupTestDatabase() {
  console.log('🧪 Setting up isolated test database (helpdesk_test)...');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.includes('helpdesk_test')) {
    throw new Error(
      "Safety guard: DATABASE_URL must point to a test database (containing 'helpdesk_test'). Current: " + databaseUrl
    );
  }

  const rootDir = path.resolve(__dirname, '..');
  const env = { ...process.env, DATABASE_URL: databaseUrl };

  try {
    console.log('🔄 Syncing Prisma schema to test database...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: rootDir,
      env,
      stdio: 'inherit',
    });

    console.log('🌱 Seeding test database with default admin & agent...');
    execSync('npx ts-node prisma/seed.ts', {
      cwd: rootDir,
      env,
      stdio: 'inherit',
    });

    console.log('✅ Test database is fully initialized and seeded!');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

// Allow direct execution: ts-node scripts/setup-test-db.ts
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
