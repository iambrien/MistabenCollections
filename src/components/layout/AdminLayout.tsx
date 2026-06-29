import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Menu, Download, X } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "@/stores/authStore";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import NotificationDropdown from "@/components/features/NotificationDropdown";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useAdminNotifications();

  // Capture the install prompt event
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("pwa_banner_dismissed");
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("pwa_banner_dismissed", "1");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* PWA Install Banner */}
        {showInstallBanner && !isInstalled && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[hsl(0,0%,8%)] text-white text-sm border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-lg overflow-hidden">
                <img src="/admin-icon-512.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs">Install Admin Panel</p>
                <p className="text-white/50 text-xs truncate">Add to Home Screen for quick access</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 brand-gradient text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
              <button onClick={dismissBanner} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
          </div>
        )}

        {/* Top header bar — notification bell lives here */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile title */}
          <span className="font-bold text-lg flex-1 lg:hidden">
            MISTA<span className="text-brand">BEN</span> Admin
          </span>

          {/* Desktop spacer */}
          <div className="hidden lg:flex flex-1" />

          {/* Install button (mobile) */}
          {installPrompt && !isInstalled && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand/30 px-2.5 py-1.5 rounded-lg hover:bg-brand/5 transition-colors"
              title="Install app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Notification bell */}
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            open={notifOpen}
            onToggle={() => setNotifOpen((v) => !v)}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
            onClearAll={clearAll}
            onClose={() => setNotifOpen(false)}
          />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
