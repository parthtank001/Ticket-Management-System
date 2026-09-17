import { describe, it, expect } from 'vitest';
import {
  createTicketSchema,
  updateTicketSchema,
  getTicketsQuerySchema,
} from '@helpdesk/core';

describe('Ticket Validation Schemas & Assigned User Validation', () => {
  describe('createTicketSchema', () => {
    it('validates a valid create ticket payload without assigned user', () => {
      const result = createTicketSchema.safeParse({
        studentName: 'Maya Lin',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login to portal',
        message: 'I get an error logging in.',
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
      });
      expect(result.success).toBe(true);
    });

    it('accepts assignedAgentId when provided', () => {
      const result = createTicketSchema.safeParse({
        studentName: 'Maya Lin',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login to portal',
        message: 'I get an error logging in.',
        assignedAgentId: 'agent-123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedAgentId).toBe('agent-123');
      }
    });

    it('accepts assignedToId when provided', () => {
      const result = createTicketSchema.safeParse({
        studentName: 'Maya Lin',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login to portal',
        message: 'I get an error logging in.',
        assignedToId: 'agent-456',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedToId).toBe('agent-456');
      }
    });

    it('accepts null for assignedToId and assignedAgentId', () => {
      const result = createTicketSchema.safeParse({
        studentName: 'Maya Lin',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login to portal',
        message: 'I get an error logging in.',
        assignedToId: null,
        assignedAgentId: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedToId).toBeNull();
        expect(result.data.assignedAgentId).toBeNull();
      }
    });

    it('rejects invalid email addresses', () => {
      const result = createTicketSchema.safeParse({
        studentName: 'Maya Lin',
        studentEmail: 'invalid-email',
        subject: 'Cannot login',
        message: 'Need help',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty sender name', () => {
      const result = createTicketSchema.safeParse({
        studentName: '   ',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login',
        message: 'Need help',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTicketSchema', () => {
    it('accepts updating assignedAgentId to a valid string user ID', () => {
      const result = updateTicketSchema.safeParse({
        assignedAgentId: 'user-cuid-12345',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedAgentId).toBe('user-cuid-12345');
      }
    });

    it('accepts updating assignedToId to a valid string user ID', () => {
      const result = updateTicketSchema.safeParse({
        assignedToId: 'user-cuid-67890',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedToId).toBe('user-cuid-67890');
      }
    });

    it('accepts unassigning a ticket by passing null for assignedToId or assignedAgentId', () => {
      const result1 = updateTicketSchema.safeParse({
        assignedToId: null,
      });
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.assignedToId).toBeNull();
      }

      const result2 = updateTicketSchema.safeParse({
        assignedAgentId: null,
      });
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.assignedAgentId).toBeNull();
      }
    });

    it('accepts partial ticket status and category updates alongside assignedToId', () => {
      const result = updateTicketSchema.safeParse({
        status: 'RESOLVED',
        category: 'TECHNICAL_QUESTION',
        assignedToId: 'user-123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('RESOLVED');
        expect(result.data.category).toBe('TECHNICAL_QUESTION');
        expect(result.data.assignedToId).toBe('user-123');
      }
    });
  });

  describe('getTicketsQuerySchema', () => {
    it('accepts assignedAgentId and assignedToId filter parameters', () => {
      const result1 = getTicketsQuerySchema.safeParse({
        assignedAgentId: 'agent-123',
      });
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.assignedAgentId).toBe('agent-123');
      }

      const result2 = getTicketsQuerySchema.safeParse({
        assignedToId: 'agent-456',
      });
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.assignedToId).toBe('agent-456');
      }
    });
  });
});
