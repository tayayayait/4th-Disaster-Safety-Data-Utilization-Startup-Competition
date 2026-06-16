import { z } from "zod";

import type { RiskLevel } from "@/lib/types";

export const BACKGROUND_LOCATION_ENABLED = false;

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export const notificationConsentSchema = z.object({
  pushConsent: z.boolean(),
  browserPermission: z.enum(["default", "granted", "denied", "unsupported"]),
  alertThreshold: z.enum(["WATCH", "WARNING", "CRITICAL"]),
  backgroundLocationEnabled: z.literal(false),
  consentedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

export type NotificationConsentState = z.infer<typeof notificationConsentSchema>;

export const DEFAULT_NOTIFICATION_CONSENT: NotificationConsentState = {
  pushConsent: false,
  browserPermission: "default",
  alertThreshold: "WARNING",
  backgroundLocationEnabled: BACKGROUND_LOCATION_ENABLED,
  consentedAt: null,
  revokedAt: null,
};

export const getBrowserNotificationPermission = (): BrowserNotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
};

export const canSendRiskAlert = (
  state: NotificationConsentState,
  riskLevel: RiskLevel,
): boolean => {
  if (!state.pushConsent || state.browserPermission !== "granted") return false;
  if (state.backgroundLocationEnabled) return false;

  const priority: Record<Exclude<RiskLevel, "SAFE" | "UNKNOWN">, number> = {
    WATCH: 1,
    WARNING: 2,
    CRITICAL: 3,
  };
  if (riskLevel === "SAFE" || riskLevel === "UNKNOWN") return false;
  return priority[riskLevel] >= priority[state.alertThreshold];
};

export const requestNotificationPermissionWithConsent = async (
  explicitConsent: boolean,
): Promise<{
  allowed: boolean;
  permission: BrowserNotificationPermission;
  reason?: "explicit_consent_required" | "unsupported" | "denied";
}> => {
  if (!explicitConsent) {
    return {
      allowed: false,
      permission: getBrowserNotificationPermission(),
      reason: "explicit_consent_required",
    };
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return { allowed: false, permission: "unsupported", reason: "unsupported" };
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") return { allowed: false, permission, reason: "denied" };
  return { allowed: true, permission };
};

export const parseStoredNotificationConsent = (value: string | null): NotificationConsentState => {
  if (!value) return DEFAULT_NOTIFICATION_CONSENT;

  try {
    return notificationConsentSchema.parse(JSON.parse(value));
  } catch {
    return DEFAULT_NOTIFICATION_CONSENT;
  }
};
