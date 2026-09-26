// Role Explicit Union
export type Role = 'ADMIN' | 'AGENT';
export type UserRole = Role;

// Category Explicit Union
export type Category =
  | 'GENERAL_QUESTION'
  | 'TECHNICAL_QUESTION'
  | 'REFUND_REQUEST';
export type TicketCategory = Category;

// Priority Explicit Union
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketPriority = Priority;

// TicketStatus Explicit Union
export type TicketStatus = 'NEW' | 'PROCESSING' | 'OPEN' | 'RESOLVED' | 'CLOSED';
export type TicketStatusType = TicketStatus;

// SenderType Explicit Union
export type SenderType = 'STUDENT' | 'AGENT' | 'SYSTEM';

// Explicit Human-Readable Label Mappings
export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'New',
  PROCESSING: 'Processing',
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  AGENT: 'Agent',
};

export const SENDER_TYPE_LABELS: Record<SenderType, string> = {
  STUDENT: 'Customer',
  AGENT: 'Support Agent',
  SYSTEM: 'System',
};
