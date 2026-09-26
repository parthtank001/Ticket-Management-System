import fs from 'fs';
import path from 'path';
import { prisma } from '../../db';

/**
 * Automatically ensures and deploys database stored procedures & functions
 * into the PostgreSQL instance upon server startup.
 */
export async function deployStoredFunctions(): Promise<void> {
  try {
    const sqlFilePath = path.join(__dirname, 'get_dashboard_stats.sql');
    if (fs.existsSync(sqlFilePath)) {
      const sql = fs.readFileSync(sqlFilePath, 'utf-8');
      await prisma.$executeRawUnsafe(sql);
      console.log('✅ PostgreSQL stored function "get_dashboard_stats" registered successfully.');
    }
  } catch (error: any) {
    console.warn('⚠️ Warning: Could not deploy stored functions to PostgreSQL (using fallback):', error?.message || error);
  }
}
