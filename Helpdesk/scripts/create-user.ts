import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createUser() {
  const args = process.argv.slice(2);
  const name = args[0] || 'Helpdesk Agent';
  const email = args[1] || 'agent@example.com';
  const password = args[2] || 'password123';
  const roleInput = (args[3] || 'AGENT').toUpperCase();
  const role = roleInput === 'ADMIN' ? Role.ADMIN : Role.AGENT;

  console.log(`👤 Creating/updating user: ${email} (Name: "${name}", Role: ${role})...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      emailVerified: true,
      isActive: true,
    },
    create: {
      name,
      email,
      role,
      emailVerified: true,
      isActive: true,
    },
  });

  const hashedPassword = await hashPassword(password);

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
    console.log(`   ✓ Updated credential account for ${email}`);
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
    console.log(`   ✓ Created credential account for ${email}`);
  }

  console.log(`✅ User ${email} created/updated successfully!`);
}

createUser()
  .catch((e) => {
    console.error('❌ Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
