import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

  const agentEmail = process.env.AGENT_EMAIL || 'agent@example.com';
  const agentPassword = process.env.AGENT_PASSWORD || 'password123';

  interface SeedUser {
    email: string;
    password: string;
    name: string;
    role: Role;
  }

  const usersToSeed: SeedUser[] = [
    {
      email: adminEmail,
      password: adminPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
    {
      email: agentEmail,
      password: agentPassword,
      name: 'Helpdesk Agent',
      role: Role.AGENT,
    },
  ];

  for (const userData of usersToSeed) {
    console.log(`👤 Seeding user: ${userData.email} (${userData.role})...`);

    // 1. Upsert User record
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
        emailVerified: true,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        emailVerified: true,
        isActive: true,
        deletedAt: null,
      },
    });

    // 2. Hash password using Better Auth hashing mechanism
    const hashedPassword = await hashPassword(userData.password);

    // 3. Find or create associated Account record for credential login
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
      console.log(`   ✓ Updated credential account for ${userData.email}`);
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
      console.log(`   ✓ Created credential account for ${userData.email}`);
    }
  }

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
