import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function seedTestTickets() {
  console.log('🚀 Preparing test agent and assigned test tickets...');

  const testAgentEmail = 'test.agent@example.com';
  const testAgentName = 'Test Agent (Delete Me)';
  const testPassword = 'password123';

  // 1. Create or ensure Test Agent exists and is active
  const testAgent = await prisma.user.upsert({
    where: { email: testAgentEmail },
    update: {
      name: testAgentName,
      role: 'AGENT',
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: testAgentName,
      email: testAgentEmail,
      role: 'AGENT',
      isActive: true,
      emailVerified: true,
    },
  });

  const hashedPassword = await hashPassword(testPassword);
  const existingAccount = await prisma.account.findFirst({
    where: { userId: testAgent.id, providerId: 'credential' },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: testAgent.id,
        accountId: testAgent.id,
        providerId: 'credential',
        password: hashedPassword,
        issuer: 'local:credential',
      },
    });
  }

  console.log(`👤 Test Agent ready: ${testAgent.name} (${testAgent.email}) [ID: ${testAgent.id}]`);

  // 2. Create sample tickets assigned to this agent
  const testTicketsData = [
    {
      subject: 'Refund request for Course #104 (Assigned to Test Agent)',
      studentName: 'Sarah Connor',
      studentEmail: 'sarah.connor@example.com',
      category: 'REFUND_REQUEST' as const,
      priority: 'HIGH' as const,
      status: 'OPEN' as const,
      summary: 'Student requested a refund due to accidental duplicate charge on course enrollment.',
      messages: [
        {
          senderType: 'STUDENT' as const,
          senderEmail: 'sarah.connor@example.com',
          body: 'Hello, I accidentally bought Course #104 twice. Could you please process a refund for one of the transactions?',
          bodyHtml: '<p>Hello,</p><p>I accidentally bought <strong>Course #104</strong> twice. Could you please process a refund for one of the transactions?</p>',
        },
        {
          senderType: 'AGENT' as const,
          senderEmail: testAgentEmail,
          body: 'Hi Sarah, I have reviewed your account and initiated the refund request for transaction #98421.',
          bodyHtml: '<p>Hi Sarah,</p><p>I have reviewed your account and initiated the refund request for transaction <code>#98421</code>.</p>',
        }
      ]
    },
    {
      subject: 'Login issues with Web Development Lab (Assigned to Test Agent)',
      studentName: 'David Miller',
      studentEmail: 'david.miller@example.com',
      category: 'TECHNICAL_QUESTION' as const,
      priority: 'URGENT' as const,
      status: 'OPEN' as const,
      summary: 'Student cannot log in to the interactive terminal container for Module 3.',
      messages: [
        {
          senderType: 'STUDENT' as const,
          senderEmail: 'david.miller@example.com',
          body: 'I keep getting Connection Refused error when starting the web lab container in Module 3.',
          bodyHtml: '<p>I keep getting <em>Connection Refused</em> error when starting the web lab container in Module 3.</p>',
        }
      ]
    },
    {
      subject: 'Inquiry regarding certificate generation (Assigned to Test Agent)',
      studentName: 'Emily Watson',
      studentEmail: 'emily.watson@example.com',
      category: 'GENERAL_QUESTION' as const,
      priority: 'MEDIUM' as const,
      status: 'OPEN' as const,
      summary: 'Student has completed all modules and is asking about the completion certificate.',
      messages: [
        {
          senderType: 'STUDENT' as const,
          senderEmail: 'emily.watson@example.com',
          body: 'I finished all assignments yesterday. When will the downloadable PDF certificate become available?',
          bodyHtml: '<p>I finished all assignments yesterday. When will the downloadable PDF certificate become available?</p>',
        }
      ]
    }
  ];

  const createdTickets = [];

  for (const item of testTicketsData) {
    const ticket = await prisma.ticket.create({
      data: {
        subject: item.subject,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        category: item.category,
        priority: item.priority,
        status: item.status,
        summary: item.summary,
        assignedAgentId: testAgent.id,
        messages: {
          create: item.messages,
        },
      },
      include: {
        assignedAgent: true,
        messages: true,
      },
    });

    createdTickets.push(ticket);
    console.log(`🎫 Created Ticket #${ticket.id}: "${ticket.subject}" (Assigned to: ${ticket.assignedAgent?.name})`);
  }

  console.log('\n========================================');
  console.log('✅ TEST SEED COMPLETED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`Test Agent: ${testAgent.name} (${testAgent.email})`);
  console.log('Created Tickets:');
  for (const t of createdTickets) {
    console.log(`  • Ticket #${t.id} - ${t.subject} [AssignedAgentId: ${t.assignedAgentId}]`);
  }
  console.log('========================================\n');
}

seedTestTickets()
  .catch((err) => {
    console.error('❌ Failed to seed test tickets:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
