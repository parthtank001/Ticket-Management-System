-- Stored function for real-time dashboard analytics computation in PostgreSQL
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_tickets INT;
  v_open_tickets INT;
  v_resolved_tickets INT;
  v_closed_tickets INT;
  v_ai_resolved_tickets INT;
  v_human_resolved_tickets INT;
  v_ai_resolved_percentage NUMERIC;
  v_ai_resolved_percentage_of_resolved NUMERIC;
  v_avg_resolution_time_ms BIGINT;
  v_ai_avg_resolution_time_ms BIGINT;
  v_human_avg_resolution_time_ms BIGINT;
  v_category_breakdown JSONB;
  v_priority_breakdown JSONB;
  v_status_breakdown JSONB;
  v_tickets_per_day JSONB;
  v_recent_tickets JSONB;
  v_result JSONB;
BEGIN
  -- 1. Core ticket counts
  SELECT COUNT(*) INTO v_total_tickets FROM "Ticket";

  SELECT COUNT(*) INTO v_open_tickets
  FROM "Ticket"
  WHERE "status" IN ('OPEN', 'NEW', 'PROCESSING');

  SELECT COUNT(*) INTO v_resolved_tickets
  FROM "Ticket"
  WHERE "status" = 'RESOLVED';

  SELECT COUNT(*) INTO v_closed_tickets
  FROM "Ticket"
  WHERE "status" = 'CLOSED';

  -- 2. AI Resolved Tickets
  SELECT COUNT(*) INTO v_ai_resolved_tickets
  FROM "Ticket" t
  WHERE t."status" IN ('RESOLVED', 'CLOSED')
    AND (
      EXISTS (
        SELECT 1 FROM "webhook_log" wl
        WHERE wl."ticketId" = t."id"
          AND wl."source" = 'auto_resolve_module'
          AND wl."status" = 'resolved'
      )
      OR t."body" LIKE '%[Auto-Resolution Reply from Code with Mosh Support%'
      OR t."summary" ILIKE '%automated resolution provided%'
    );

  v_human_resolved_tickets := GREATEST(0, (v_resolved_tickets + v_closed_tickets) - v_ai_resolved_tickets);

  -- 3. Percentages
  IF v_total_tickets > 0 THEN
    v_ai_resolved_percentage := ROUND((v_ai_resolved_tickets::numeric / v_total_tickets::numeric) * 100, 1);
  ELSE
    v_ai_resolved_percentage := 0.0;
  END IF;

  IF (v_resolved_tickets + v_closed_tickets) > 0 THEN
    v_ai_resolved_percentage_of_resolved := ROUND((v_ai_resolved_tickets::numeric / (v_resolved_tickets + v_closed_tickets)::numeric) * 100, 1);
  ELSE
    v_ai_resolved_percentage_of_resolved := 0.0;
  END IF;

  -- 4. Average Resolution Times in MS
  SELECT COALESCE(ROUND(AVG(GREATEST(0, EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000))), 0)::BIGINT
  INTO v_avg_resolution_time_ms
  FROM "Ticket"
  WHERE "status" IN ('RESOLVED', 'CLOSED');

  SELECT COALESCE(ROUND(AVG(GREATEST(0, EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) * 1000))), 0)::BIGINT
  INTO v_ai_avg_resolution_time_ms
  FROM "Ticket" t
  WHERE t."status" IN ('RESOLVED', 'CLOSED')
    AND (
      EXISTS (
        SELECT 1 FROM "webhook_log" wl
        WHERE wl."ticketId" = t."id"
          AND wl."source" = 'auto_resolve_module'
          AND wl."status" = 'resolved'
      )
      OR t."body" LIKE '%[Auto-Resolution Reply from Code with Mosh Support%'
      OR t."summary" ILIKE '%automated resolution provided%'
    );

  SELECT COALESCE(ROUND(AVG(GREATEST(0, EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) * 1000))), 0)::BIGINT
  INTO v_human_avg_resolution_time_ms
  FROM "Ticket" t
  WHERE t."status" IN ('RESOLVED', 'CLOSED')
    AND NOT (
      EXISTS (
        SELECT 1 FROM "webhook_log" wl
        WHERE wl."ticketId" = t."id"
          AND wl."source" = 'auto_resolve_module'
          AND wl."status" = 'resolved'
      )
      OR t."body" LIKE '%[Auto-Resolution Reply from Code with Mosh Support%'
      OR t."summary" ILIKE '%automated resolution provided%'
    );

  -- 5. Category Breakdown
  SELECT jsonb_build_object(
    'GENERAL_QUESTION', COUNT(*) FILTER (WHERE "category" = 'GENERAL_QUESTION'),
    'TECHNICAL_QUESTION', COUNT(*) FILTER (WHERE "category" = 'TECHNICAL_QUESTION'),
    'REFUND_REQUEST', COUNT(*) FILTER (WHERE "category" = 'REFUND_REQUEST'),
    'UNCATEGORIZED', COUNT(*) FILTER (WHERE "category" IS NULL)
  ) INTO v_category_breakdown
  FROM "Ticket";

  -- 6. Priority Breakdown
  SELECT jsonb_build_object(
    'LOW', COUNT(*) FILTER (WHERE "priority" = 'LOW'),
    'MEDIUM', COUNT(*) FILTER (WHERE "priority" = 'MEDIUM'),
    'HIGH', COUNT(*) FILTER (WHERE "priority" = 'HIGH'),
    'URGENT', COUNT(*) FILTER (WHERE "priority" = 'URGENT')
  ) INTO v_priority_breakdown
  FROM "Ticket";

  -- 7. Status Breakdown
  SELECT jsonb_build_object(
    'NEW', COUNT(*) FILTER (WHERE "status" = 'NEW'),
    'PROCESSING', COUNT(*) FILTER (WHERE "status" = 'PROCESSING'),
    'OPEN', COUNT(*) FILTER (WHERE "status" = 'OPEN'),
    'RESOLVED', COUNT(*) FILTER (WHERE "status" = 'RESOLVED'),
    'CLOSED', COUNT(*) FILTER (WHERE "status" = 'CLOSED')
  ) INTO v_status_breakdown
  FROM "Ticket";

  -- 8. Tickets Per Day over past 30 days
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'formattedDate', to_char(d.day, 'Mon FMDD'),
      'count', COALESCE(t.cnt, 0)
    ) ORDER BY d.day ASC
  ) INTO v_tickets_per_day
  FROM generate_series(
    (CURRENT_DATE - INTERVAL '29 days')::date,
    CURRENT_DATE::date,
    INTERVAL '1 day'
  ) AS d(day)
  LEFT JOIN (
    SELECT DATE("createdAt") AS ticket_date, COUNT(*) AS cnt
    FROM "Ticket"
    GROUP BY DATE("createdAt")
  ) t ON t.ticket_date = d.day::date;

  -- 9. Recent 5 Tickets with assigned agent
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t."id",
        'subject', t."subject",
        'studentEmail', t."studentEmail",
        'studentName', t."studentName",
        'body', t."body",
        'bodyHtml', t."bodyHtml",
        'category', t."category",
        'priority', t."priority",
        'status', t."status",
        'summary', t."summary",
        'aiDraftResponse', t."aiDraftResponse",
        'assignedAgentId', t."assignedAgentId",
        'createdAt', t."createdAt",
        'updatedAt', t."updatedAt",
        'assignedAgent', CASE
          WHEN u."id" IS NOT NULL THEN jsonb_build_object(
            'id', u."id",
            'name', u."name",
            'email', u."email",
            'role', u."role"
          )
          ELSE NULL
        END
      ) ORDER BY t."createdAt" DESC
    ),
    '[]'::jsonb
  ) INTO v_recent_tickets
  FROM (
    SELECT * FROM "Ticket"
    ORDER BY "createdAt" DESC
    LIMIT 5
  ) t
  LEFT JOIN "user" u ON t."assignedAgentId" = u."id";

  -- Assemble final JSONB payload
  v_result := jsonb_build_object(
    'totalTickets', v_total_tickets,
    'openTickets', v_open_tickets,
    'resolvedTickets', v_resolved_tickets,
    'closedTickets', v_closed_tickets,
    'aiResolvedTickets', v_ai_resolved_tickets,
    'aiResolvedPercentage', v_ai_resolved_percentage,
    'aiResolvedPercentageOfResolved', v_ai_resolved_percentage_of_resolved,
    'humanResolvedTickets', v_human_resolved_tickets,
    'avgResolutionTimeMs', v_avg_resolution_time_ms,
    'aiAvgResolutionTimeMs', v_ai_avg_resolution_time_ms,
    'humanAvgResolutionTimeMs', v_human_avg_resolution_time_ms,
    'categoryBreakdown', v_category_breakdown,
    'priorityBreakdown', v_priority_breakdown,
    'statusBreakdown', v_status_breakdown,
    'ticketsPerDay', COALESCE(v_tickets_per_day, '[]'::jsonb),
    'recentTickets', COALESCE(v_recent_tickets, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
