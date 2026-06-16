import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  DEFAULT_NOTIFICATION_CONSENT,
  getBrowserNotificationPermission,
  notificationConsentSchema,
  parseStoredNotificationConsent,
  requestNotificationPermissionWithConsent,
  type NotificationConsentState,
} from "@/lib/notifications/consent";

const STORAGE_KEY = "flood-exit.notification-consent.v1";

const saveState = (state: NotificationConsentState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const syncState = async (state: NotificationConsentState) => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const row: TablesInsert<"notification_preferences"> = {
    user_id: data.user.id,
    push_consent: state.pushConsent,
    browser_permission: state.browserPermission,
    alert_threshold: state.alertThreshold,
    background_location_enabled: false,
    consented_at: state.consentedAt,
    revoked_at: state.revokedAt,
  };

  await supabase.from("notification_preferences").upsert(row);
};

export const useNotificationConsent = () => {
  const [state, setState] = useState<NotificationConsentState>(DEFAULT_NOTIFICATION_CONSENT);
  const [message, setMessage] = useState(
    "명시적으로 동의하기 전에는 푸시 알림을 요청하지 않습니다.",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseStoredNotificationConsent(window.localStorage.getItem(STORAGE_KEY));
    const next = notificationConsentSchema.parse({
      ...stored,
      browserPermission: getBrowserNotificationPermission(),
      backgroundLocationEnabled: false,
    });
    setState(next);
    saveState(next);
  }, []);

  const enablePush = async () => {
    const result = await requestNotificationPermissionWithConsent(true);
    const now = new Date().toISOString();
    const next = notificationConsentSchema.parse({
      ...state,
      pushConsent: result.allowed,
      browserPermission: result.permission,
      backgroundLocationEnabled: false,
      consentedAt: result.allowed ? now : null,
      revokedAt: result.allowed ? null : now,
    });

    setState(next);
    saveState(next);
    void syncState(next).catch(() => undefined);
    setMessage(
      result.allowed
        ? "푸시 알림 동의가 저장됐습니다. 백그라운드 위치 추적은 비활성 상태입니다."
        : "브라우저 알림 권한이 허용되지 않아 푸시 알림이 비활성 상태입니다.",
    );
  };

  const revokePush = () => {
    const next = notificationConsentSchema.parse({
      ...state,
      pushConsent: false,
      browserPermission: getBrowserNotificationPermission(),
      backgroundLocationEnabled: false,
      revokedAt: new Date().toISOString(),
    });
    setState(next);
    saveState(next);
    void syncState(next).catch(() => undefined);
    setMessage(
      "푸시 알림 동의를 철회했습니다. 브라우저 권한은 브라우저 설정에서 별도 변경해야 합니다.",
    );
  };

  return useMemo(
    () => ({
      state,
      message,
      enablePush,
      revokePush,
    }),
    [message, state],
  );
};
