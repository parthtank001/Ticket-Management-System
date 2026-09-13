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
export type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
export type TicketStatusType = TicketStatus;

// SenderType Explicit Union
export type SenderType = 'STUDENT' | 'AGENT' | 'SYSTEM';
