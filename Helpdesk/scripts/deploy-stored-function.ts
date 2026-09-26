import fs from 'fs';
import path from 'path';
import { prisma } from '../server/db';

export async function deployStoredFunctions() {
  const sqlPath = path.join(__dirname, '../server/db/stored-procedures/get_dashboard_stats.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await prisma.$executeRawUnsafe(sql);
  console.log('✅ PostgreSQL stored function "get_dashboard_stats" created/updated successfully.');

  const rows = await prisma.$queryRaw<[{ stats: any }]>`SELECT get_dashboard_stats() AS stats;`;
  console.log('✅ Tested function execution. Returned stats payload:');
  console.log(JSON.stringify(rows[0]?.stats, null, 2));
}

if (require.main === module || process.argv[1]?.includes('deploy-stored-function')) {
  deployStoredFunctions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to deploy stored function:', err);
      process.exit(1);
    });
}
