import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";

const STORAGE_KEY = "mistaben_last_seen_order_ts";
const UNREAD_KEY = "mistaben_unread_orders";
const POLL_INTERVAL = 6000; // 6 seconds
const SOUND_COOLDOWN_MS = 60000; // minimum 60s between sounds
const MAX_SOUNDS_PER_SESSION = 2; // maximum sounds to play

export interface Notification {
  id: string;
  orderId: string;
  customerName: string;
  amountPaid: number | null;
  createdAt: string;
  read: boolean;
}

let lastSoundTime = 0;
let soundsPlayedThisSession = 0;

function playNotificationSound() {
  const now = Date.now();
  // Hard limit: max 2 sounds per session, with at least 60s between them
  if (soundsPlayedThisSession >= MAX_SOUNDS_PER_SESSION) return;
  if (now - lastSoundTime < SOUND_COOLDOWN_MS && lastSoundTime !== 0) return;

  lastSoundTime = now;
  soundsPlayedThisSession++;

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Two-tone chime — plays exactly ONCE, total duration ~0.65s
    const tones = [{ t: 0, f: 1046 }, { t: 0.2, f: 1318 }];
    tones.forEach(({ t, f }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.38);
    });
    // Close context after sound finishes to free resources
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 800);
  } catch (_) {
    // AudioContext may be blocked; ignore
  }
}

function setBadge(count: number) {
  try {
    // App Badge API (works when app is open)
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(count);
      } else {
        (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge();
      }
    }
    // Also update via service worker (works when app is closed/backgrounded)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SET_BADGE", count });
    }
  } catch (_) {}
}

function loadStoredNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(UNREAD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifs: Notification[]) {
  // Keep last 30 only
  const trimmed = notifs.slice(0, 30);
  localStorage.setItem(UNREAD_KEY, JSON.stringify(trimmed));
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadStoredNotifications());
  const lastTsRef = useRef<string>(localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString());
  const isFirstPollRef = useRef(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      setBadge(0);
      return updated;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      const newUnread = updated.filter((n) => !n.read).length;
      setBadge(newUnread);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(UNREAD_KEY);
    setBadge(0);
  }, []);

  const poll = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, amount_paid, created_at")
      .gt("created_at", lastTsRef.current)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return;

    // On first poll, just record the timestamp — don't surface old orders as new
    if (isFirstPollRef.current) {
      isFirstPollRef.current = false;
      const latest = data[data.length - 1].created_at;
      lastTsRef.current = latest;
      localStorage.setItem(STORAGE_KEY, latest);
      return;
    }

    const newNotifs: Notification[] = data.map((o: Order) => ({
      id: `notif-${o.id}`,
      orderId: o.id,
      customerName: o.customer_name,
      amountPaid: o.amount_paid,
      createdAt: o.created_at,
      read: false,
    }));

    if (newNotifs.length > 0) {
      playNotificationSound();

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fresh = newNotifs.filter((n) => !existingIds.has(n.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev];
        saveNotifications(merged);
        setBadge(merged.filter((n) => !n.read).length);
        return merged;
      });

      // Also trigger browser Notification if permission granted
      if (Notification.permission === "granted") {
        const plural = newNotifs.length > 1 ? `${newNotifs.length} new orders` : `Order from ${newNotifs[0].customerName}`;
        new Notification("Mistaben Collections", {
          body: `You just received ${plural}!`,
          icon: "/admin-icon-512.png",
          badge: "/admin-icon-512.png",
          tag: "new-order",
        });
      }

      const latest = data[data.length - 1].created_at;
      lastTsRef.current = latest;
      localStorage.setItem(STORAGE_KEY, latest);
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Update badge on mount with current unread count
    const stored = loadStoredNotifications();
    const unread = stored.filter((n) => !n.read).length;
    setBadge(unread);
  }, []);

  // Polling loop
  useEffect(() => {
    // Immediate first poll
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [poll]);

  return { notifications, unreadCount, markAllRead, markRead, clearAll };
}
