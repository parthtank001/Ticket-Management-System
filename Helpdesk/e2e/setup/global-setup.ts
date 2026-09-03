import { FullConfig } from '@playwright/test';
import { setupTestDatabase } from '../../scripts/setup-test-db';

async function globalSetup(config: FullConfig) {
  console.log('\n🚀 [Playwright Global Setup] Initializing test database environment...');
  await setupTestDatabase();
  console.log('✨ [Playwright Global Setup] Environment ready for test execution.\n');
}

export default globalSetup;
