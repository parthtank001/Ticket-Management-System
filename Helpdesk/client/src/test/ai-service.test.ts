import { describe, it, expect } from 'vitest';
import {
  extractFirstName,
  heuristicPolishReply,
  heuristicClassifyAndDraft,
  heuristicSummarizeTicketAndHistory,
} from '../../../server/services/ai';

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
      expect(output).toContain('\n\nBest regards,\nHelpdesk Support Team');
    });
  });

  describe('heuristicClassifyAndDraft Function', () => {
    it('classifies refund-related inquiries as REFUND_REQUEST and addresses customer by first name', () => {
      const result = heuristicClassifyAndDraft(
        'Billing inquiry regarding double charge',
        'I was overcharged on my subscription fee invoice and need a refund',
        'Lucas Vance'
      );
      expect(result.category).toBe('REFUND_REQUEST');
      expect(result.priority).toBe('HIGH');
      expect(result.aiDraftResponse).toContain('Hello Lucas,\n\n');
      expect(result.aiDraftResponse).not.toContain('Vance');
    });

    it('classifies technical inquiries as TECHNICAL_QUESTION and addresses customer by first name', () => {
      const result = heuristicClassifyAndDraft(
        'Cannot access student portal',
        'I am getting a 403 error and cannot access the portal',
        'Chloe Decker'
      );
      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.priority).toBe('HIGH');
      expect(result.aiDraftResponse).toContain('Hello Chloe,\n\n');
      expect(result.aiDraftResponse).toContain('Regarding your technical issue');
    });

    it('classifies general inquiries as GENERAL_QUESTION', () => {
      const result = heuristicClassifyAndDraft(
        'Course schedule information',
        'When does the summer semester lecture series start?',
        'Elena Gilbert'
      );
      expect(result.category).toBe('GENERAL_QUESTION');
      expect(result.priority).toBe('MEDIUM');
      expect(result.aiDraftResponse).toContain('Hello Elena,\n\n');
    });

    it('detects urgent priority from critical keywords', () => {
      const result = heuristicClassifyAndDraft(
        'URGENT: Exam today and portal is broken',
        'I have an emergency exam today and cannot open questions',
        'Oliver Queen'
      );
      expect(result.priority).toBe('URGENT');
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
});

