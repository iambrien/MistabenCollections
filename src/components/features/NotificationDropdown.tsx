import { useEffect, useRef } from "react";
import { Bell, Package, X, CheckCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Notification } from "@/hooks/useAdminNotifications";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  open,
  onToggle,
  onMarkAllRead,
  onMarkRead,
  onClearAll,
  onClose,
}: NotificationDropdownProps) {
  const navigate = useNavigate();
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const handleNotifClick = (n: Notification) => {
    onMarkRead(n.id);
    onClose();
    navigate("/admin/orders");
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={onToggle}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all",
          open
            ? "bg-foreground text-white border-foreground"
            : "bg-card border-border hover:bg-muted text-foreground"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-bold leading-none animate-bounce-once border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-brand text-white px-1.5 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">New orders will appear here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors",
                    !n.read && "bg-brand/5"
                  )}
                >
                  <div className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5",
                    !n.read ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"
                  )}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "font-medium")}>
                      New order from {n.customerName}
                    </p>
                    {n.amountPaid && (
                      <p className="text-xs text-brand font-medium mt-0.5">
                        ₦{n.amountPaid.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-brand mt-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => { onClose(); navigate("/admin/orders"); }}
                className="w-full text-center text-xs text-brand font-semibold hover:underline"
              >
                View all orders →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
