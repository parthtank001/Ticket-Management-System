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
  sanitizeHtml,
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

  describe('sanitizeHtml Utility (DOMPurify XSS Sanitizer)', () => {
    it('returns empty string for null, undefined, empty, or non-string inputs', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(false as any)).toBe('');
    });

    it('strips <script> tags and executable JavaScript payloads', () => {
      const malicious = '<script>alert("XSS")</script><p>Hello World</p>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("XSS")');
      expect(sanitized).toContain('<p>Hello World</p>');
    });

    it('strips inline event handlers (onerror, onload, onclick, onmouseover)', () => {
      const malicious = '<img src="invalid.jpg" onerror="alert(\'XSS\')" alt="Test" />';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('<img');
    });

    it('strips javascript: pseudo-protocols from href and src attributes', () => {
      const malicious = '<a href="javascript:alert(document.cookie)">Click here</a>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('Click here');
    });

    it('strips dangerous iframe, embed, and object tags', () => {
      const malicious = '<iframe src="http://attacker.com"></iframe><embed src="malware.swf" /><object data="exploit.pdf"></object>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('<embed');
      expect(sanitized).not.toContain('<object');
    });

    it('preserves benign and safe formatting HTML tags', () => {
      const safeHtml = '<p>This is <strong>bold</strong>, <em>italic</em>, and <a href="https://example.com">a valid link</a>.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
      const sanitized = sanitizeHtml(safeHtml);
      expect(sanitized).toContain('<strong>bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
      expect(sanitized).toContain('<a href="https://example.com">a valid link</a>');
      expect(sanitized).toContain('<li>Item 1</li>');
    });

    it('supports custom configuration overrides', () => {
      const dirty = '<p>Paragraph</p><b>Bold</b>';
      const customSanitized = sanitizeHtml(dirty, { ALLOWED_TAGS: ['b'] });
      expect(customSanitized).not.toContain('<p>');
      expect(customSanitized).toContain('<b>Bold</b>');
    });
  });
});
