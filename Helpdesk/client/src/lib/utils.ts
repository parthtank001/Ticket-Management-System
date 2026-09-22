import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from "dompurify"
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  SENDER_TYPE_LABELS,
  type TicketStatus,
  type Category,
  type Priority,
  type Role,
  type SenderType,
} from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize HTML strings using DOMPurify to protect against XSS (Cross-Site Scripting) attacks.
 * Strips dangerous executable scripts, harmful event handlers (e.g. onerror, onload),
 * unsafe protocols (e.g. javascript:), and malicious DOM clobbering vectors.
 */
export function sanitizeHtml(
  dirty?: string | null,
  config?: Parameters<typeof DOMPurify.sanitize>[1]
): string {
  if (!dirty || typeof dirty !== 'string') return '';
  if (config) {
    return DOMPurify.sanitize(dirty, config) as string;
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
  }) as string;
}

/**
 * Explicitly format ticket status to human-readable title label
 */
export function formatStatusTitle(status?: TicketStatus | string | null): string {
  if (!status) return '';
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as TicketStatus];
  }
  return status;
}

/**
 * Explicitly format ticket category to human-readable title label
 */
export function formatCategoryTitle(category?: Category | string | null): string {
  if (!category) return 'Uncategorized';
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as Category];
  }
  return category;
}

/**
 * Explicitly format ticket priority to human-readable title label
 */
export function formatPriorityTitle(priority?: Priority | string | null): string {
  if (!priority) return 'Medium';
  if (priority in PRIORITY_LABELS) {
    return PRIORITY_LABELS[priority as Priority];
  }
  return priority;
}

/**
 * Explicitly format user role to human-readable title label
 */
export function formatRoleTitle(role?: Role | string | null): string {
  if (!role) return 'Agent';
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as Role];
  }
  return role;
}

/**
 * Explicitly format message sender type to human-readable title label
 */
export function formatSenderTypeTitle(senderType?: SenderType | string | null): string {
  if (!senderType) return 'Customer';
  if (senderType in SENDER_TYPE_LABELS) {
    return SENDER_TYPE_LABELS[senderType as SenderType];
  }
  return senderType;
}

/**
 * Safely format date/time using Intl/toLocaleString
 */
export function formatDateTime(
  date?: string | Date | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, options ?? { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

/**
 * Format date in medium format with short time (e.g., "Sep 17, 2026, 7:45 PM")
 */
export function formatDateMedium(date?: string | Date | number | null): string {
  return formatDateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Format date in short format with short time (e.g., "9/17/26, 7:45 PM")
 */
export function formatDateShort(date?: string | Date | number | null): string {
  return formatDateTime(date, { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Format date in compact format for table cells (e.g., "Sep 17, 07:45 PM")
 */
export function formatDateCompact(date?: string | Date | number | null): string {
  return formatDateTime(date, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date only (e.g., "Sep 17, 2026")
 */
export function formatDateOnly(date?: string | Date | number | null): string {
  if (!date) return '';
  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Extract uppercase initials from a full name (e.g. "John Doe" -> "JD")
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
