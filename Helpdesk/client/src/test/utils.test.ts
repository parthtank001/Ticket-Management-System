import { describe, it, expect } from 'vitest';
import {
  cn,
  formatStatusTitle,
  formatCategoryTitle,
  formatPriorityTitle,
  formatRoleTitle,
  formatSenderTypeTitle,
  formatDateTime,
  formatDateMedium,
  formatDateShort,
  formatDateCompact,
  formatDateOnly,
  getInitials,
} from '../lib/utils';

describe('Utility Functions (client/src/lib/utils.ts)', () => {
  describe('cn (Tailwind class merger)', () => {
    it('merges class names correctly and resolves Tailwind conflicts', () => {
      expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
      expect(cn('px-2', 'px-4')).toBe('px-4');
      expect(cn('text-sm', false && 'text-lg', null, undefined, 'font-bold')).toBe('text-sm font-bold');
    });
  });

  describe('Explicit Title Formatters', () => {
    it('formatStatusTitle formats status correctly', () => {
      expect(formatStatusTitle('OPEN')).toBe('Open');
      expect(formatStatusTitle('RESOLVED')).toBe('Resolved');
      expect(formatStatusTitle('CLOSED')).toBe('Closed');
      expect(formatStatusTitle(null)).toBe('');
      expect(formatStatusTitle(undefined)).toBe('');
      expect(formatStatusTitle('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });

    it('formatCategoryTitle formats category correctly', () => {
      expect(formatCategoryTitle('GENERAL_QUESTION')).toBe('General Question');
      expect(formatCategoryTitle('TECHNICAL_QUESTION')).toBe('Technical Question');
      expect(formatCategoryTitle('REFUND_REQUEST')).toBe('Refund Request');
      expect(formatCategoryTitle(null)).toBe('Uncategorized');
      expect(formatCategoryTitle(undefined)).toBe('Uncategorized');
      expect(formatCategoryTitle('')).toBe('Uncategorized');
    });

    it('formatPriorityTitle formats priority correctly', () => {
      expect(formatPriorityTitle('LOW')).toBe('Low');
      expect(formatPriorityTitle('MEDIUM')).toBe('Medium');
      expect(formatPriorityTitle('HIGH')).toBe('High');
      expect(formatPriorityTitle('URGENT')).toBe('Urgent');
      expect(formatPriorityTitle(null)).toBe('Medium');
      expect(formatPriorityTitle(undefined)).toBe('Medium');
    });

    it('formatRoleTitle formats role correctly', () => {
      expect(formatRoleTitle('ADMIN')).toBe('Admin');
      expect(formatRoleTitle('AGENT')).toBe('Agent');
      expect(formatRoleTitle(null)).toBe('Agent');
      expect(formatRoleTitle(undefined)).toBe('Agent');
    });

    it('formatSenderTypeTitle formats sender type correctly', () => {
      expect(formatSenderTypeTitle('STUDENT')).toBe('Customer');
      expect(formatSenderTypeTitle('AGENT')).toBe('Support Agent');
      expect(formatSenderTypeTitle('SYSTEM')).toBe('System');
      expect(formatSenderTypeTitle(null)).toBe('Customer');
      expect(formatSenderTypeTitle(undefined)).toBe('Customer');
    });
  });

  describe('Date/Time Formatting Utilities', () => {
    const testDateIso = '2026-09-17T12:30:00.000Z';
    const testDate = new Date(testDateIso);

    it('formatDateTime returns empty string on null, undefined, or invalid date', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime(undefined)).toBe('');
      expect(formatDateTime('invalid-date-string')).toBe('');
    });

    it('formatDateTime formats Date objects, ISO strings, and numeric timestamps', () => {
      const formattedFromObj = formatDateTime(testDate);
      const formattedFromStr = formatDateTime(testDateIso);
      const formattedFromNum = formatDateTime(testDate.getTime());

      expect(formattedFromObj).toBeTruthy();
      expect(formattedFromObj).toBe(formattedFromStr);
      expect(formattedFromObj).toBe(formattedFromNum);
    });

    it('formatDateMedium formats with medium date and short time', () => {
      const formatted = formatDateMedium(testDateIso);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('formatDateShort formats with short date and short time', () => {
      const formatted = formatDateShort(testDateIso);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('formatDateCompact formats with compact month/day and hour/minute', () => {
      const formatted = formatDateCompact(testDateIso);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('formatDateOnly formats date without time component', () => {
      const formatted = formatDateOnly(testDateIso);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2026');
      expect(formatDateOnly(null)).toBe('');
      expect(formatDateOnly('invalid')).toBe('');
    });
  });

  describe('getInitials Utility', () => {
    it('extracts two initials from multi-word names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane Mary Watson')).toBe('JW');
      expect(getInitials('alexandra smith')).toBe('AS');
    });

    it('extracts two characters for single-word names', () => {
      expect(getInitials('Admin')).toBe('AD');
      expect(getInitials('Support')).toBe('SU');
      expect(getInitials('A')).toBe('A');
    });

    it('handles empty, null, or whitespace-only names safely', () => {
      expect(getInitials(null)).toBe('U');
      expect(getInitials(undefined)).toBe('U');
      expect(getInitials('')).toBe('U');
      expect(getInitials('   ')).toBe('U');
    });
  });
});
