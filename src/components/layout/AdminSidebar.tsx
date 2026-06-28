import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Tag, Settings, LogOut, X, Users } from "lucide-react";
import { useAuth } from "@/stores/authStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: ShoppingBag, label: "Orders", href: "/admin/orders" },
  { icon: Tag, label: "Categories", href: "/admin/categories" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/admin/login");
  };

  return (
    <aside className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
        <span className="text-lg font-bold">MISTA<span className="text-brand">BEN</span></span>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} to={href} onClick={onClose}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-brand text-brand-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
          <p className="text-xs font-medium truncate">{user?.email}</p>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-sidebar-accent transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
