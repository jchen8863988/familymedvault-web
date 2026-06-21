"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { loadBuildingFromFirebase, cancelFirebaseBooking, joinFirebaseWaitlist, leaveFirebaseWaitlist } from "@/lib/ampnest/firebaseClient";
import { isAmpNestFirebaseConfigured } from "@/lib/ampnest/config";
import {
  loadBuildingPayload,
  parseSetupParam,
  saveBuildingPayload,
} from "@/lib/ampnest/storage";
import {
  isWebPushEnabled,
  watchSpotsForLocalNotifications,
  getWebPushSubId,
  enableWebPush,
} from "@/lib/ampnest/webPush";
import { WebPushBanner } from "@/components/ampnest/WebPushBanner";
import {
  loadWaitlist,
  removeWaitlistEntry,
  saveWaitlistEntry,
  hasWaitlistForPushSub,
  hasWaitlistForSpot,
  type StoredWaitlistEntry,
} from "@/lib/ampnest/myWaitlist";
import {
  collectRecoverableWebBookings,
  markMyBookingCancelled,
  removeMyBooking,
  saveMyBooking,
  type StoredWebBooking,
} from "@/lib/ampnest/myBookings";
import {
  getSavedUserName,
  saveUserName,
} from "@/lib/ampnest/webSession";

import type { BookingSlot, Building, ChargerSpot } from "@/lib/ampnest/types";

const DEMO_SPOTS: ChargerSpot[] = [
  { id: "demo-1", buildingId: "demo", label: "#1", number: 1, status: "free", chargerPowerKw: 7.2 },
  {
    id: "demo-2",
    buildingId: "demo",
    label: "#2",
    number: 2,
    status: "occupied",
    occupiedBy: "张先生",
    estimatedFreeAt: "21:30",
    chargerPowerKw: 7.2,
  },
  {
    id: "demo-3",
    buildingId: "demo",
    label: "#3",
    number: 3,
    status: "booked",
    chargerPowerKw: 7.2,
    nextBooking: {
      id: "bk-demo",
      spotId: "demo-3",
      buildingId: "demo",
      userId: "u1",
      userName: "李女士",
      startTime: new Date().setHours(22, 0, 0, 0).toString(),
      endTime: new Date().setHours(1, 0, 0, 0).toString(),
      status: "pending",
    },
  },
];

function formatTime(iso: string | number): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AmpNestBookingClient() {
  const t = useTranslations("ampnestBook");
  const searchParams = useSearchParams();

  const [inviteInput, setInviteInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [building, setBuilding] = useState<Building | null>(null);
  const [spots, setSpots] = useState<ChargerSpot[]>([]);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"live" | "local" | "demo">("demo");

  const [selectedSpot, setSelectedSpot] = useState<ChargerSpot | null>(null);
  const [userName, setUserName] = useState("");
  const [pushReady, setPushReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myWaitlist, setMyWaitlist] = useState<StoredWaitlistEntry[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    setUserName(getSavedUserName());
  }, []);

  useEffect(() => {
    if (userName.trim()) saveUserName(userName);
  }, [userName]);

  const myBookings = useMemo(
    () => (inviteCode ? collectRecoverableWebBookings(inviteCode, spots, userName) : []),
    [inviteCode, spots, userName],
  );

  useEffect(() => {
    if (!inviteCode) return;
    for (const b of myBookings) {
      saveMyBooking(b, inviteCode, b.spotLabel);
    }
  }, [inviteCode, myBookings]);

  useEffect(() => {
    if (!inviteCode) {
      setMyWaitlist([]);
      return;
    }
    setMyWaitlist(loadWaitlist(inviteCode));
  }, [inviteCode, spots]);

  useEffect(() => {
    if (!building?.id || mode !== "live") return;
    setPushReady(isWebPushEnabled(building.id));
    const unsub = watchSpotsForLocalNotifications(building.id, spots, (key, values) =>
      t(key as "pushSpotFree", values as Record<string, string>),
    );
    return unsub;
  }, [building?.id, mode, spots, t]);

  const applyPayload = useCallback(
    (code: string, payload: { building: Building; spots: ChargerSpot[]; bookings?: BookingSlot[] }) => {
      setInviteCode(code.toUpperCase());
      setBuilding(payload.building);
      setSpots(payload.spots);
      const fromSpots = payload.spots
        .map((s) => s.nextBooking)
        .filter(Boolean) as BookingSlot[];
      setBookings(payload.bookings?.length ? payload.bookings : fromSpots);
      setMode("local");
      saveBuildingPayload(code, {
        building: payload.building,
        spots: payload.spots,
        bookings: payload.bookings ?? fromSpots,
      });
    },
    [],
  );

  useEffect(() => {
    const codeParam = (searchParams.get("code") || "").toUpperCase();
    const setupParam = searchParams.get("setup");

    if (setupParam && codeParam) {
      const parsed = parseSetupParam(setupParam);
      if (parsed?.building && parsed.spots) {
        applyPayload(codeParam, parsed);
        setLoading(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("setup");
        window.history.replaceState({}, "", url.toString());
        return;
      }
    }

    if (codeParam) {
      setInviteCode(codeParam);
      setInviteInput(codeParam);
    }

    let unsub: (() => void) | undefined;

    (async () => {
      if (codeParam && isAmpNestFirebaseConfigured()) {
        const unsubFn = await loadBuildingFromFirebase(codeParam, (b, s) => {
          setBuilding(b);
          setSpots(s);
          setMode("live");
          setLoading(false);
        });
        if (unsubFn) {
          unsub = unsubFn;
          return;
        }
      }

      if (codeParam) {
        const local = loadBuildingPayload(codeParam);
        if (local) {
          applyPayload(codeParam, local);
          setLoading(false);
          return;
        }
      }

      if (codeParam) {
        setBuilding({ id: "demo", name: `${t("inviteCode")} ${codeParam}`, inviteCode: codeParam, spotCount: 3 });
        setSpots(DEMO_SPOTS);
        setMode("demo");
      }
      setLoading(false);
    })();

    return () => unsub?.();
  }, [searchParams, applyPayload, t]);

  const statusLabel = (status: ChargerSpot["status"]) => {
    if (status === "free") return t("statusFree");
    if (status === "occupied") return t("statusOccupied");
    return t("statusBooked");
  };

  const openWaitlist = (spot: ChargerSpot) => {
    if (spot.status === "booked") {
      showToast(t("webCantBookBooked"));
      return;
    }
    setSelectedSpot(spot);
  };

  const closeBooking = () => setSelectedSpot(null);

  const handleLoadCode = () => {
    const code = inviteInput.trim().toUpperCase();
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.location.href = url.toString();
  };

  const handleJoinWaitlist = async () => {
    if (!selectedSpot || !userName.trim()) {
      showToast(t("needName"));
      return;
    }

    let webPushSubId = getWebPushSubId();
    if (!webPushSubId && building?.id) {
      const push = await enableWebPush({ buildingId: building.id, userName: userName.trim() });
      if (!push.ok || !push.subId) {
        showToast(t("pushRequiredForWaitlist"));
        return;
      }
      webPushSubId = push.subId;
      setPushReady(true);
    }
    if (!webPushSubId) {
      showToast(t("pushRequiredForWaitlist"));
      return;
    }

    if (hasWaitlistForSpot(inviteCode, selectedSpot.id, webPushSubId)) {
      showToast(t("waitlistSuccess"));
      closeBooking();
      return;
    }
    if (hasWaitlistForPushSub(inviteCode, webPushSubId, selectedSpot.id)) {
      showToast(t("waitlistOnePerDevice"));
      return;
    }

    setSubmitting(true);
    try {
      const entry: StoredWaitlistEntry = {
        id: `wl-${Date.now()}`,
        spotId: selectedSpot.id,
        inviteCode,
        spotLabel: selectedSpot.label,
        userName: userName.trim(),
        webPushSubId,
        joinedAt: new Date().toISOString(),
      };
      if (mode === "live" && building?.id) {
        const firebaseId = await joinFirebaseWaitlist({
          spotId: selectedSpot.id,
          buildingId: building.id,
          userName: userName.trim(),
          webPushSubId,
        });
        if (firebaseId) entry.id = firebaseId;
      }
      saveWaitlistEntry(entry);
      setMyWaitlist(loadWaitlist(inviteCode));
      showToast(t("waitlistSuccess"));
      closeBooking();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWaitlist = async (entry: StoredWaitlistEntry) => {
    if (!window.confirm(t("cancelWaitlistConfirm"))) return;
    setCancellingId(entry.id);
    try {
      if (mode === "live" && isAmpNestFirebaseConfigured()) {
        await leaveFirebaseWaitlist(entry.spotId, entry.id);
      }
      removeWaitlistEntry(entry.id);
      setMyWaitlist(loadWaitlist(inviteCode));
      showToast(t("waitlistCancelled"));
    } catch {
      showToast(t("cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelBooking = async (booking: StoredWebBooking) => {
    if (!window.confirm(t("cancelConfirm"))) return;
    setCancellingId(booking.id);
    try {
      if (mode === "live" && isAmpNestFirebaseConfigured()) {
        await cancelFirebaseBooking(booking.id, booking.spotId, booking.userId);
      } else {
        setSpots((prev) =>
          prev.map((s) =>
            s.nextBooking?.id === booking.id
              ? { ...s, status: "free" as const, nextBooking: undefined }
              : s,
          ),
        );
        if (mode === "local") {
          const local = loadBuildingPayload(inviteCode);
          if (local) {
            saveBuildingPayload(inviteCode, {
              ...local,
              spots: local.spots.map((s) =>
                s.nextBooking?.id === booking.id
                  ? { ...s, status: "free" as const, nextBooking: undefined }
                  : s,
              ),
            });
          }
        }
      }
      markMyBookingCancelled(booking.id);
      removeMyBooking(booking.id);
      showToast(t("cancelledSuccess"));
    } catch {
      showToast(t("cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  };

  const buildingTitle = useMemo(() => {
    if (!building) return t("enterCodeTitle");
    const suffix = mode === "demo" ? ` · ${t("demoMode")}` : "";
    return `🏢 ${building.name} · ${spots.length} ${t("sharedSpots")}${suffix}`;
  }, [building, spots.length, mode, t]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-slate-600">{t("loading")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-lg font-semibold text-slate-900">
          Amp<span className="text-emerald-700">Nest</span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
          {t("webBadge")}
        </span>
      </div>

      {!inviteCode ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t("enterCodeTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("enterCodeDesc")}</p>
          <label className="mt-4 block text-xs font-medium text-slate-500">{t("inviteCode")}</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
            placeholder="OV3B01"
          />
          <button
            type="button"
            onClick={handleLoadCode}
            className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {t("loadBuilding")}
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600">{buildingTitle}</p>

          {building && mode === "live" && (
            <WebPushBanner
              buildingId={building.id}
              userName={userName}
              onEnabled={() => setPushReady(true)}
            />
          )}
          {pushReady && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900">
              ✓ {t("pushEnabled")}
            </div>
          )}

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
            {t("rightsBanner")}{" "}
            <Link href="/apps" className="font-medium text-emerald-800 underline underline-offset-2">
              {t("downloadAppLink")}
            </Link>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <label className="block text-xs font-medium text-slate-500">{t("nameLookupLabel")}</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t("nameLookupPlaceholder")}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{t("nameLookupHint")}</p>
          </div>

          {myBookings.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("myBookingsTitle")}
              </p>
              <ul className="space-y-2">
                {myBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"
                  >
                    <div className="text-sm font-medium text-slate-900">
                      {t("myBookingSpot", { label: booking.spotLabel ?? booking.spotId })}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      {t("myBookingsHint")}
                    </p>
                    <button
                      type="button"
                      disabled={cancellingId === booking.id}
                      onClick={() => void handleCancelBooking(booking)}
                      className="mt-3 w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {cancellingId === booking.id ? t("cancelling") : t("cancelBooking")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {myWaitlist.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("myWaitlistTitle")}
              </p>
              <ul className="space-y-2">
                {myWaitlist.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">
                        {t("spotLabel", { label: entry.spotLabel ?? entry.spotId })}
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        {t("webTierBadge")}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">{t("waitlistPushEnabled")}</div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      {t("myWaitlistHint")}
                    </p>
                    <button
                      type="button"
                      disabled={cancellingId === entry.id}
                      onClick={() => handleCancelWaitlist(entry)}
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {cancellingId === entry.id ? t("cancelling") : t("cancelWaitlist")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t("liveStatus")}
          </p>

          {spots.length === 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {t("noSpots")}
            </div>
          ) : (
            <ul className="space-y-2">
              {spots.map((spot) => {
                const canWaitlist = spot.status === "free" || spot.status === "occupied";
                const alreadyWaiting = myWaitlist.some((e) => e.spotId === spot.id);
                const sub =
                  spot.status === "occupied"
                    ? t("occupiedSub", {
                        time: spot.estimatedFreeAt ?? "—",
                        name: spot.occupiedBy ?? "",
                      })
                    : spot.status === "booked" && spot.nextBooking
                      ? `${spot.nextBooking.userName} · ${formatTime(spot.nextBooking.startTime)} – ${formatTime(spot.nextBooking.endTime)}`
                      : t("freeSub");

                return (
                  <li
                    key={spot.id}
                    className={`rounded-2xl border p-4 ${
                      spot.status === "booked"
                        ? "border-slate-100 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                          spot.status === "free"
                            ? "bg-emerald-100 text-emerald-800"
                            : spot.status === "occupied"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {spot.label}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {t("spotLabel", { label: spot.label })}
                        </div>
                        <div className="truncate text-xs text-slate-500">{sub}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                            spot.status === "free"
                              ? "bg-emerald-50 text-emerald-800"
                              : spot.status === "occupied"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {statusLabel(spot.status)}
                        </span>
                        {canWaitlist && (
                          <button
                            type="button"
                            onClick={() => openWaitlist(spot)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              alreadyWaiting
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            }`}
                          >
                            {alreadyWaiting ? t("waitlistJoined") : t("waitlistBtn")}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedSpot && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">
                {t("waitlistTitle")} · {selectedSpot.label}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {selectedSpot.status === "free" ? t("waitlistFreeDesc") : t("waitlistDesc")}
              </p>
              <label className="mt-3 block text-xs text-slate-500">{t("name")}</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              {!pushReady && building && (
                <p className="mt-3 text-xs leading-relaxed text-amber-800">{t("pushRequiredForWaitlist")}</p>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleJoinWaitlist()}
                className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {t("joinWaitlist")}
              </button>
              <button
                type="button"
                onClick={closeBooking}
                className="mt-2 w-full rounded-2xl border border-slate-200 py-3 text-sm text-slate-600"
              >
                {t("cancel")}
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">{t("footerNote")}</p>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-xl bg-emerald-700 px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
