import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { Enums, Json, TablesInsert } from "@/integrations/supabase/types";

const auditActionSchema = z.enum(["OPS_ACTION", "NOTICE_GENERATION", "SHELTER_STATUS_UPDATE"]);

const auditInputSchema = z.object({
  action: auditActionSchema,
  entityType: z.string().min(1).max(80),
  entityId: z.string().min(1).max(120).optional(),
  summary: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditActionType = Enums<"audit_action_type">;
export type AuditInput = z.input<typeof auditInputSchema>;

const SENSITIVE_TEXT_PATTERN =
  /(api[_-]?key|secret|token|authorization|bearer|service[_-]?role|password)\s*[:=]\s*[^,\s]+/gi;

export const redactSensitiveText = (value: string): string =>
  value.replace(SENSITIVE_TEXT_PATTERN, "$1=[REDACTED]").slice(0, 800);

const sanitizeJson = (value: unknown): Json => {
  if (value == null) return null;
  if (typeof value === "string") return redactSensitiveText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeJson(item),
      ]),
    );
  }
  return String(value);
};

export const recordAuditLog = async (input: AuditInput) => {
  const parsed = auditInputSchema.parse(input);
  const userResult = await supabase.auth.getUser();
  const actorId = userResult.data.user?.id ?? null;

  const row: TablesInsert<"audit_logs"> = {
    actor_id: actorId,
    action: parsed.action,
    entity_type: parsed.entityType,
    entity_id: parsed.entityId ?? null,
    summary: parsed.summary,
    metadata: sanitizeJson(parsed.metadata ?? {}) as Json,
  };

  const { error } = await supabase.from("audit_logs").insert(row);

  if (error) {
    return {
      ok: false as const,
      userMessage: "작업 기록을 저장하지 못했습니다. 기능 실행 결과는 별도로 확인하세요.",
      operatorMessage: redactSensitiveText(error.message),
    };
  }

  return { ok: true as const };
};
