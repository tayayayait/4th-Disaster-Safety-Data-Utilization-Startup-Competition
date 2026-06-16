import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { recordAuditLog } from "@/lib/ops/audit";

const updateShelterOperationSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPERATING", "CHECK_REQUIRED", "EXCLUDED"]).optional(),
  capacity: z.number().int().nonnegative().optional(),
  checkedAt: z.string().nullable().optional(),
  source: z.string().min(1).optional(),
});

export type UpdateShelterOperationInput = z.input<typeof updateShelterOperationSchema>;

export const updateShelterOperation = async (input: UpdateShelterOperationInput) => {
  const parsed = updateShelterOperationSchema.parse(input);
  const userResult = await supabase.auth.getUser();
  const actorId = userResult.data.user?.id ?? null;

  if (!actorId) {
    return {
      ok: false as const,
      userMessage: "권한이 없습니다.",
    };
  }

  const patch: TablesUpdate<"shelter_operations"> = {
    ...(parsed.status ? { status: parsed.status } : {}),
    ...(parsed.capacity != null ? { capacity: parsed.capacity } : {}),
    ...(parsed.checkedAt !== undefined ? { checked_at: parsed.checkedAt } : {}),
    ...(parsed.source ? { source: parsed.source } : {}),
    updated_by: actorId,
  };

  const { error } = await supabase.from("shelter_operations").update(patch).eq("id", parsed.id);

  if (error) {
    return {
      ok: false as const,
      userMessage: "대피소 운영상태를 저장하지 못했습니다.",
    };
  }

  void recordAuditLog({
    action: "SHELTER_STATUS_UPDATE",
    entityType: "shelter_operations",
    entityId: parsed.id,
    summary: "대피소 운영상태 변경",
    metadata: {
      status: parsed.status ?? null,
      capacity: parsed.capacity ?? null,
      checkedAt: parsed.checkedAt ?? null,
      source: parsed.source ?? null,
    },
  }).catch((err) => console.error("Audit log failed:", err));

  return { ok: true as const };
};
