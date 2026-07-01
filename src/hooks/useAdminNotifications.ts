import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";

const STORAGE_KEY = "mistaben_last_seen_order_ts";
const UNREAD_KEY = "mistaben_unread_orders";
const POLL_INTERVAL = 6000;
const SOUND_COOLDOWN_MS = 60000;
const MAX_SOUNDS_PER_SESSION = 2;

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
  if (soundsPlayedThisSession >= MAX_SOUNDS_PER_SESSION) return;
  if (now - lastSoundTime < SOUND_COOLDOWN_MS && lastSoundTime !== 0) return;
  lastSoundTime = now;
  soundsPlayedThisSession++;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const tones = [{ t: 0, f: 1046 }, { t: 0.22, f: 1318 }];
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
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 900);
  } catch (_) {}
}

function setBadge(count: number) {
  try {
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(count);
      } else {
        (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge();
      }
    }
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SET_BADGE", count });
    }
  } catch (_) {}
}

/** Ask SW to show a system-level notification (works even when user is in another app) */
function showSystemNotification(order: { id: string; customerName: string; amountPaid: number | null }) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  try {
    // Route 1: via Service Worker (shown even when tab is backgrounded / different app open)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_ORDER_NOTIFICATION",
        orderId: order.id,
        orderShortId: shortId,
        customerName: order.customerName,
        amount: order.amountPaid,
      });
      return; // SW handles it — most reliable for cross-app visibility
    }

    // Route 2: Notification API directly (fallback when SW not yet controlling)
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🛍️ New Order — Mistaben Collections", {
        body: `Order #${shortId} from ${order.customerName}${order.amountPaid ? " · ₦" + Number(order.amountPaid).toLocaleString() : ""}`,
        icon: "/admin-icon-512.png",
        badge: "/admin-icon-512.png",
        tag: `order-${order.id}`,
        requireInteraction: true,
      } as NotificationOptions);
    }
  } catch (_) {}
}

function loadStoredNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(UNREAD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(UNREAD_KEY, JSON.stringify(notifs.slice(0, 50)));
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
      setBadge(updated.filter((n) => !n.read).length);
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

    // First poll: just record timestamp, don't surface old orders
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

      // Show a system notification for each new order (unique tag = no duplicates)
      newNotifs.forEach((n) =>
        showSystemNotification({ id: n.orderId, customerName: n.customerName, amountPaid: n.amountPaid })
      );

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fresh = newNotifs.filter((n) => !existingIds.has(n.id));
        if (fresh.length === 0) return prev;
        const merged = [...fresh, ...prev];
        saveNotifications(merged);
        setBadge(merged.filter((n) => !n.read).length);
        return merged;
      });

      const latest = data[data.length - 1].created_at;
      lastTsRef.current = latest;
      localStorage.setItem(STORAGE_KEY, latest);
    }
  }, []);

  // Request notification permission on mount + sync badge
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const stored = loadStoredNotifications();
    setBadge(stored.filter((n) => !n.read).length);
  }, []);

  // Polling loop
  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [poll]);

  return { notifications, unreadCount, markAllRead, markRead, clearAll };
}
