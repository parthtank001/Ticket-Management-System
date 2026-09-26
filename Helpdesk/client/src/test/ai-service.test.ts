import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFirstName,
  heuristicPolishReply,
  heuristicClassifyAndDraft,
  heuristicSummarizeTicketAndHistory,
  classifyAndDraftInquiry,
  classifyTicketInBackground,
  scheduleTicketClassification,
  getAiAgentUser,
} from '../../../server/services/ai';
import { prisma } from '../../../server/db';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn(),
}));

describe('AI Support Service Unit Tests', () => {
  describe('extractFirstName Helper', () => {
    it('extracts first name from standard "First Last" format', () => {
      expect(extractFirstName('Alice Johnson')).toBe('Alice');
      expect(extractFirstName('Samantha Reed')).toBe('Samantha');
      expect(extractFirstName('John Doe')).toBe('John');
    });

    it('extracts first name from "Last, First" format', () => {
      expect(extractFirstName('Johnson, Alice')).toBe('Alice');
      expect(extractFirstName('Taylor, Samantha')).toBe('Samantha');
    });

    it('handles single word names', () => {
      expect(extractFirstName('Alice')).toBe('Alice');
      expect(extractFirstName('Bob')).toBe('Bob');
    });

    it('handles multi-part names by taking the very first name', () => {
      expect(extractFirstName('Mary Jane Watson')).toBe('Mary');
      expect(extractFirstName('Jean-Luc Picard')).toBe('Jean-Luc');
    });

    it('trims surrounding whitespace properly', () => {
      expect(extractFirstName('   Christopher Miller   ')).toBe('Christopher');
    });

    it('falls back to "Student" when name is undefined, null, or empty string', () => {
      expect(extractFirstName(undefined)).toBe('Student');
      expect(extractFirstName('')).toBe('Student');
      expect(extractFirstName('   ')).toBe('Student');
    });
  });

  describe('heuristicPolishReply Function', () => {
    it('returns an empty string when given empty or whitespace text', () => {
      expect(heuristicPolishReply('')).toBe('');
      expect(heuristicPolishReply('   ')).toBe('');
    });

    it('addresses the customer by only their first name when full name is given', () => {
      const output = heuristicPolishReply('we reset your password please check email', 'Alice Johnson');
      expect(output).toContain('Hello Alice,\n\n');
      expect(output).not.toContain('Johnson');
    });

    it('falls back to "Hello Student," when no student name is provided', () => {
      const output = heuristicPolishReply('we reset your password please check email');
      expect(output).toContain('Hello Student,\n\n');
    });

    it('strips pre-existing raw greetings to format a clean personalized salutation', () => {
      const output1 = heuristicPolishReply('hi we verified your invoice and processed refund', 'Bob Smith');
      expect(output1.startsWith('Hello Bob,\n\n')).toBe(true);

      const output2 = heuristicPolishReply('hello, your ticket has been resolved', 'Samantha');
      expect(output2.startsWith('Hello Samantha,\n\n')).toBe(true);

      const output3 = heuristicPolishReply('dear student, please check your credentials', 'David');
      expect(output3.startsWith('Hello David,\n\n')).toBe(true);
    });

    it('expands common informal abbreviations into professional phrasing', () => {
      const input = 'pls check the pdf url and let me know if cant login';
      const output = heuristicPolishReply(input, 'Emma');
      expect(output).toContain('Please check the PDF URL and let me know if cannot login.');
    });

    it('capitalizes abbreviations like vpn, api, id, pdf, url', () => {
      const input = 'reconnect your vpn and check the api id url';
      const output = heuristicPolishReply(input, 'Alex');
      expect(output).toContain('VPN');
      expect(output).toContain('API');
      expect(output).toContain('ID');
      expect(output).toContain('URL');
    });

    it('ensures terminal punctuation is added if missing', () => {
      const output = heuristicPolishReply('your course enrollment is now active', 'Sophia');
      expect(output).toContain('Your course enrollment is now active.');
    });

    it('strips redundant trailing thanks/regards before appending the formal sign-off', () => {
      const output = heuristicPolishReply('we processed your refund thanks', 'Daniel');
      expect(output).toContain('We processed your refund.');
      expect(output).toContain('\n\nBest regards,\nCode with Mosh Support');
    });
  });

  describe('heuristicClassifyAndDraft Function', () => {
    it('classifies refund-related inquiries as REFUND_REQUEST and addresses customer by first name', () => {
      const result = heuristicClassifyAndDraft(
        'Billing inquiry regarding refund policy',
        'How does your money-back guarantee work and how do I request a refund?',
        'Lucas Vance'
      );
      expect(result.category).toBe('REFUND_REQUEST');
      expect(result.canAutoResolve).toBe(true);
      expect(result.aiDraftResponse).toContain('Hello Lucas,\n\n');
      expect(result.aiDraftResponse).not.toContain('Vance');
    });

    it('auto-resolves password reset inquiries from knowledge base', () => {
      const result = heuristicClassifyAndDraft(
        'Forgot password',
        'I forgot my password. How do I reset it?',
        'Chloe Decker'
      );
      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.canAutoResolve).toBe(true);
      expect(result.aiDraftResponse).toContain('Hello Chloe,\n\n');
      expect(result.aiDraftResponse).toContain('Forgot Password');
    });

    it('escalates legal action inquiries without auto-resolving', () => {
      const result = heuristicClassifyAndDraft(
        'Legal action regarding issue',
        'I will hire a lawyer to sue your team if this is not resolved',
        'Elena Gilbert'
      );
      expect(result.canAutoResolve).toBe(false);
      expect(result.autoResolveReason).toContain('legal action');
    });

    it('classifies general inquiries as GENERAL_QUESTION', () => {
      const result = heuristicClassifyAndDraft(
        'Course schedule information',
        'When does the summer semester lecture series start?',
        'Elena Gilbert'
      );
      expect(result.category).toBe('GENERAL_QUESTION');
      expect(result.canAutoResolve).toBe(false);
      expect(result.aiDraftResponse).toContain('Hello Elena,\n\n');
    });
  });

  describe('heuristicSummarizeTicketAndHistory Function', () => {
    it('summarizes a single-message ticket awaiting initial response', () => {
      const summary = heuristicSummarizeTicketAndHistory({
        id: 101,
        subject: 'Cannot login with 2FA token',
        studentName: 'Alice Johnson',
        studentEmail: 'alice@example.com',
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        status: 'OPEN',
        messages: [
          {
            senderType: 'STUDENT',
            senderEmail: 'alice@example.com',
            body: 'My authenticator app generates codes that are rejected with error 401.',
          },
        ],
      });

      expect(summary).toContain('Initial Issue:');
      expect(summary).toContain('Alice Johnson');
      expect(summary).toContain('Cannot login with 2FA token');
      expect(summary).toContain('TECHNICAL_QUESTION');
      expect(summary).toContain('Conversation & Actions Taken:');
      expect(summary).toContain('Awaiting support agent review');
      expect(summary).toContain('Current Status & Next Steps:');
      expect(summary).toContain('Status is OPEN');
    });

    it('summarizes multi-turn conversation with agent replies and internal notes', () => {
      const summary = heuristicSummarizeTicketAndHistory({
        id: 102,
        subject: 'Double charge on subscription fee',
        studentName: 'Lucas Vance',
        studentEmail: 'lucas@example.com',
        category: 'REFUND_REQUEST',
        priority: 'HIGH',
        status: 'RESOLVED',
        messages: [
          {
            senderType: 'STUDENT',
            senderEmail: 'lucas@example.com',
            body: 'I was charged twice for the monthly membership.',
          },
          {
            senderType: 'AGENT',
            senderEmail: 'agent@example.com',
            body: 'We verified the transaction ID and processed a refund for the second charge.',
            isInternalNote: false,
          },
          {
            senderType: 'AGENT',
            senderEmail: 'agent@example.com',
            body: 'Stripe refund reference #ref_9921 issued successfully.',
            isInternalNote: true,
          },
        ],
      });

      expect(summary).toContain('Initial Issue:');
      expect(summary).toContain('Lucas Vance');
      expect(summary).toContain('REFUND_REQUEST');
      expect(summary).toContain('Conversation & Actions Taken:');
      expect(summary).toContain('3 total message(s)');
      expect(summary).toContain('1 internal note(s)');
      expect(summary).toContain('processed a refund');
      expect(summary).toContain('Stripe refund reference');
      expect(summary).toContain('Current Status & Next Steps:');
      expect(summary).toContain('Ticket is marked as RESOLVED');
    });

    it('handles empty messages array and fallback defaults gracefully', () => {
      const summary = heuristicSummarizeTicketAndHistory({
        subject: '',
        messages: [],
      });

      expect(summary).toContain('Initial Issue:');
      expect(summary).toContain('Student');
      expect(summary).toContain('Conversation & Actions Taken:');
      expect(summary).toContain('Current Status & Next Steps:');
    });
  });

  describe('classifyTicketInBackground Function', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('transitions ticket to PROCESSING and then to RESOLVED when auto-resolvable via KB', async () => {
      const mockTicket = {
        id: 105,
        subject: 'Forgot my password',
        body: 'I forgot my password. What should I do to reset it?',
        studentName: 'Alex Rivera',
        studentEmail: 'alex@example.com',
        category: null,
        priority: 'MEDIUM',
        status: 'NEW',
      };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(mockTicket as any);
      // 1st update: status -> PROCESSING
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'PROCESSING',
      } as any);
      // 2nd update: status -> RESOLVED with KB answer
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'RESOLVED',
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
      } as any);

      const updated = await classifyTicketInBackground(105);

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 105 } });
      // Verify first update transitioned to PROCESSING
      expect(prisma.ticket.update).toHaveBeenNthCalledWith(1, {
        where: { id: 105 },
        data: { status: 'PROCESSING' },
      });
      // Verify second update resolved the ticket
      expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
        where: { id: 105 },
        data: expect.objectContaining({
          status: 'RESOLVED',
          category: 'TECHNICAL_QUESTION',
          body: expect.stringContaining('Auto-Resolution Reply from Code with Mosh Support'),
        }),
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
      expect(updated?.status).toBe('RESOLVED');
    });

    it('transitions ticket to PROCESSING and then to OPEN when inquiry requires human agent review', async () => {
      const mockTicket = {
        id: 106,
        subject: 'Bespoke corporate consulting',
        body: 'We want custom on-site consulting for 500 team members.',
        studentName: 'Elena Gilbert',
        studentEmail: 'elena@example.com',
        category: null,
        priority: 'MEDIUM',
        status: 'NEW',
      };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(mockTicket as any);
      // 1st update: PROCESSING
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'PROCESSING',
      } as any);
      // 2nd update: OPEN
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'OPEN',
        category: 'GENERAL_QUESTION',
        priority: 'MEDIUM',
      } as any);

      const updated = await classifyTicketInBackground(106);

      expect(prisma.ticket.update).toHaveBeenNthCalledWith(1, {
        where: { id: 106 },
        data: { status: 'PROCESSING' },
      });
      expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
        where: { id: 106 },
        data: expect.objectContaining({
          status: 'OPEN',
        }),
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
      expect(updated?.status).toBe('OPEN');
    });

    it('returns null gracefully when ticket is not found in database', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(null);

      const result = await classifyTicketInBackground(999);
      expect(result).toBeNull();
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('catches and handles database update errors gracefully without throwing', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
        id: 107,
        subject: 'Billing issue',
        body: 'Refund request',
        studentName: 'John',
      } as any);
      vi.mocked(prisma.ticket.update).mockRejectedValueOnce(new Error('DB connection lost'));

      const result = await classifyTicketInBackground(107);
      expect(result).toBeNull();
    });

    it('updates ticket status to OPEN when generateText or background processing throws an error', async () => {
      const mockTicket = {
        id: 109,
        subject: 'API Error test',
        body: 'Testing AI failure behavior',
        studentName: 'Oliver Queen',
        studentEmail: 'oliver@example.com',
        status: 'NEW',
      };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(mockTicket as any);
      // Update inside catch block: status -> OPEN
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'OPEN',
      } as any);

      // Trigger error in classification execution
      Object.defineProperty(mockTicket, 'subject', {
        get: () => {
          throw new Error('generateText OpenAI failure');
        },
      });

      const result = await classifyTicketInBackground(109);
      expect(result).toBeNull();

      // Verify that status was updated to OPEN in catch block
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 109 },
        data: { status: 'OPEN' },
      });
    });

    it('unassigns ticket from AI agent when inquiry cannot be auto-resolved', async () => {
      const mockAiAgent = {
        id: 'user-ai-1',
        name: 'AI',
        email: 'ai@example.com',
        role: 'AGENT',
      };
      const mockTicket = {
        id: 110,
        subject: 'Custom consulting quote',
        body: 'I need a custom consulting project.',
        studentName: 'Bruce Wayne',
        studentEmail: 'bruce@example.com',
        status: 'NEW',
        assignedAgentId: 'user-ai-1',
      };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(mockTicket as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockAiAgent as any);
      // 1st update: PROCESSING
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'PROCESSING',
      } as any);
      // 2nd update: OPEN with assignedAgentId: null
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'OPEN',
        assignedAgentId: null,
      } as any);

      const result = await classifyTicketInBackground(110);

      expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
        where: { id: 110 },
        data: expect.objectContaining({
          status: 'OPEN',
          assignedAgentId: null,
        }),
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
      expect(result?.status).toBe('OPEN');
    });

    it('maintains assignment to AI agent when ticket is auto-resolved', async () => {
      const mockAiAgent = {
        id: 'user-ai-1',
        name: 'AI',
        email: 'ai@example.com',
        role: 'AGENT',
      };
      const mockTicket = {
        id: 111,
        subject: 'I forgot my password',
        body: 'Please help reset password',
        studentName: 'Clark Kent',
        studentEmail: 'clark@example.com',
        status: 'NEW',
        assignedAgentId: 'user-ai-1',
      };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(mockTicket as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockAiAgent as any);
      // 1st update: PROCESSING
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'PROCESSING',
      } as any);
      // 2nd update: RESOLVED
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...mockTicket,
        status: 'RESOLVED',
        assignedAgentId: 'user-ai-1',
      } as any);

      const result = await classifyTicketInBackground(111);

      expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
        where: { id: 111 },
        data: expect.objectContaining({
          status: 'RESOLVED',
          assignedAgentId: 'user-ai-1',
        }),
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
      expect(result?.status).toBe('RESOLVED');
    });
  });

  describe('getAiAgentUser Function', () => {
    it('returns the AI agent user when present in the database', async () => {
      const mockAi = {
        id: 'ai-agent-id',
        name: 'AI',
        email: 'ai@example.com',
        role: 'AGENT',
        isActive: true,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockAi as any);

      const user = await getAiAgentUser();
      expect(user).toEqual(mockAi);
      expect(user?.name).toBe('AI');
    });

    it('returns null when AI agent is not found or error occurs', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

      const user = await getAiAgentUser();
      expect(user).toBeNull();
    });
  });

  describe('scheduleTicketClassification Function', () => {
    it('schedules background classification asynchronously without throwing', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
        id: 108,
        subject: 'Course question',
        body: 'When does the lecture start?',
        studentName: 'Maya',
      } as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({ id: 108 } as any);

      expect(() => scheduleTicketClassification(108)).not.toThrow();
    });
  });
});

