"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { slotConflictsWithBookings } from "@/lib/ampnest/bookingConflict";
import {
  createFirebaseBooking,
  fetchBookingsForSpot,
  loadBuildingFromFirebase,
} from "@/lib/ampnest/firebaseClient";
import {
  getAmpNestSmsWebhook,
  isAmpNestFirebaseConfigured,
} from "@/lib/ampnest/config";
import {
  loadBuildingPayload,
  parseSetupParam,
  saveBuildingPayload,
} from "@/lib/ampnest/storage";
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
  const [phone, setPhone] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

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

  const openBooking = (spot: ChargerSpot) => {
    if (spot.status !== "free") return;
    setSelectedSpot(spot);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    if (now.getHours() < 21) now.setHours(21);
    const end = new Date(now.getTime() + 2 * 3600_000);
    setStartTime(toLocalInput(now));
    setEndTime(toLocalInput(end));
  };

  const closeBooking = () => setSelectedSpot(null);

  const handleLoadCode = () => {
    const code = inviteInput.trim().toUpperCase();
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.location.href = url.toString();
  };

  const handleConfirm = async () => {
    if (!selectedSpot || !userName.trim()) {
      showToast(t("needName"));
      return;
    }
    if (!phone.trim()) {
      showToast(t("needPhone"));
      return;
    }
    if (!startTime || !endTime) {
      showToast(t("needTime"));
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      showToast(t("invalidRange"));
      return;
    }

    setSubmitting(true);
    try {
      let spotBookings = bookings.filter((b) => b.spotId === selectedSpot.id);
      if (mode === "live") {
        spotBookings = await fetchBookingsForSpot(selectedSpot.id);
      }

      if (slotConflictsWithBookings(selectedSpot.id, start, end, spotBookings)) {
        showToast(t("conflict"));
        return;
      }

      const bookingBase = {
        spotId: selectedSpot.id,
        buildingId: building?.id ?? "local",
        userId: `web-${Date.now()}`,
        userName: userName.trim(),
        phone: phone.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "pending" as const,
      };

      let full: BookingSlot;

      if (mode === "live") {
        full = await createFirebaseBooking(bookingBase);
      } else {
        full = { ...bookingBase, id: `bk-${Date.now()}` };
        const nextSpots = spots.map((s) =>
          s.id === selectedSpot.id
            ? { ...s, status: "booked" as const, nextBooking: full }
            : s,
        );
        const nextBookings = [...bookings, full];
        setSpots(nextSpots);
        setBookings(nextBookings);
        if (inviteCode) {
          saveBuildingPayload(inviteCode, {
            building: building!,
            spots: nextSpots,
            bookings: nextBookings,
          });
        }
      }

      const smsUrl = getAmpNestSmsWebhook();
      const smsBody = t("smsBody", {
        name: userName.trim(),
        spot: selectedSpot.label,
        time: start.toLocaleString(),
      });

      if (smsUrl) {
        try {
          await fetch(smsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: phone.trim(), body: smsBody, type: "booking_start" }),
          });
        } catch {
          /* non-fatal */
        }
      }

      showToast(smsUrl ? t("bookedWithSms") : t("bookedDemo", { phone: phone.trim() }));
      closeBooking();
    } catch (e) {
      if (e instanceof Error && e.message === "BOOKING_CONFLICT") {
        showToast(t("conflict"));
      } else {
        showToast(t("error"));
      }
    } finally {
      setSubmitting(false);
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
                const canBook = spot.status === "free";
                const sub =
                  spot.status === "occupied"
                    ? t("occupiedSub", {
                        time: spot.estimatedFreeAt ?? "—",
                        name: spot.occupiedBy ?? "",
                      })
                    : spot.status === "booked" && spot.nextBooking
                      ? `${spot.nextBooking.userName} · ${formatTime(spot.nextBooking.startTime)} – ${formatTime(spot.nextBooking.endTime)}`
                      : "Level 2 · 7.2 kW";

                return (
                  <li key={spot.id}>
                    <button
                      type="button"
                      disabled={!canBook}
                      onClick={() => openBooking(spot)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        canBook
                          ? "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                          : "cursor-default border-slate-100 bg-slate-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
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
                        <span
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${
                            spot.status === "free"
                              ? "bg-emerald-50 text-emerald-800"
                              : spot.status === "occupied"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {statusLabel(spot.status)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedSpot && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">
                {t("bookTitle", { label: selectedSpot.label })}
              </h3>
              <label className="mt-3 block text-xs text-slate-500">{t("name")}</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <label className="mt-3 block text-xs text-slate-500">{t("phone")}</label>
              <input
                type="tel"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <label className="mt-3 block text-xs text-slate-500">{t("start")}</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <label className="mt-3 block text-xs text-slate-500">{t("end")}</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className="mt-4 w-full rounded-2xl bg-emerald-700 py-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {t("confirm")}
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
