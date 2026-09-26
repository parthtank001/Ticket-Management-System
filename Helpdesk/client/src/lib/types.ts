export type {
  Role,
  UserRole,
  Category,
  TicketCategory,
  Priority,
  TicketPriority,
  TicketStatus,
  TicketStatusType,
  SenderType,
} from '@helpdesk/core';

export {
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  SENDER_TYPE_LABELS,
} from '@helpdesk/core';

export type {
  Ticket,
  TicketAgent,
  TicketMessage,
  CreateTicketPayload,
  UpdateTicketPayload,
  AddTicketMessagePayload,
  PolishReplyPayload,
  PolishReplyResponse,
  SummarizeTicketResponse,
  PaginatedTicketsResponse,
  ListTicketsParams,
} from './tickets-api';

export type {
  EvaluateInquiryInput,
  EvaluateInquiryOutput,
  AutoResolveTicketInput,
  AutoResolveTicketOutput,
  BatchAutoResolveInput,
  BatchAutoResolveOutput,
  AutoResolveEvaluationResult,
  AutoResolveTicketResult,
  BatchAutoResolveResult,
  AutoResolveStats,
  AutoResolveRuleInfo,
  EvaluateClassificationInput,
  EvaluateClassificationOutput,
  ClassifyTicketInput,
  ClassifyTicketOutput,
  BatchClassifyInput,
  BatchClassifyOutput,
  TicketClassificationResult,
  ClassifyTicketResult,
  BatchClassifyResult,
  ClassificationStats,
  ClassificationCategoryInfo,
  DashboardStats,
  DailyTicketCount,
  GetDashboardStatsQueryInput,
  GetDashboardStatsQueryOutput,
} from '@helpdesk/core';

