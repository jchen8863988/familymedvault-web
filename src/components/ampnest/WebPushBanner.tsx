"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  enableWebPush,
  getPushPermissionState,
  isWebPushEnabled,
  type PushPermissionState,
} from "@/lib/ampnest/webPush";

interface Props {
  buildingId: string;
  userName?: string;
  onEnabled?: () => void;
}

export function WebPushBanner({ buildingId, userName, onEnabled }: Props) {
  const t = useTranslations("ampnestBook");
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermission(getPushPermissionState());
    setEnabled(isWebPushEnabled(buildingId));
  }, [buildingId]);

  if (permission === "unsupported" || enabled || permission === "denied") {
    if (permission === "denied") {
      return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {t("pushDeniedHint")}
        </div>
      );
    }
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await enableWebPush({ buildingId, userName });
      if (result.ok) {
        setEnabled(true);
        setPermission("granted");
        onEnabled?.();
      } else if (result.reason === "denied") {
        setPermission("denied");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
          🔔
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-950">{t("pushTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">{t("pushDesc")}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleEnable()}
            className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? t("pushEnabling") : t("pushEnable")}
          </button>
        </div>
      </div>
    </div>
  );
}
