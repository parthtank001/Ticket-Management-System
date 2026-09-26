import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Standalone seed script to create or update the system AI agent.
 */
export async function seedAiAgent() {
  console.log('🤖 Seeding AI Agent user into the database...');

  const aiAgentEmail = process.env.AI_AGENT_EMAIL || 'ai@example.com';
  const aiAgentPassword = process.env.AI_AGENT_PASSWORD || 'password123';
  const aiAgentName = 'AI';

  // 1. Upsert User record
  const user = await prisma.user.upsert({
    where: { email: aiAgentEmail },
    update: {
      name: aiAgentName,
      role: 'AGENT',
      emailVerified: true,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: aiAgentName,
      email: aiAgentEmail,
      role: 'AGENT',
      emailVerified: true,
      isActive: true,
      deletedAt: null,
    },
  });

  // 2. Hash password and create/update credential account
  const hashedPassword = await hashPassword(aiAgentPassword);

  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        password: hashedPassword,
        issuer: 'local:credential',
        updatedAt: new Date(),
      },
    });
    console.log(`   ✓ Updated credential account for AI Agent (${aiAgentEmail}) [ID: ${user.id}]`);
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: hashedPassword,
        issuer: 'local:credential',
      },
    });
    console.log(`   ✓ Created credential account for AI Agent (${aiAgentEmail}) [ID: ${user.id}]`);
  }

  console.log('✅ AI Agent successfully provisioned and ready for ticket auto-resolution!');
  return user;
}

if (require.main === module) {
  seedAiAgent()
    .catch((e) => {
      console.error('❌ Error during AI agent seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
