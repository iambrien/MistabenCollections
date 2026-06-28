import { useEffect, useState } from "react";
import { Package, ShoppingBag, Tag, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Stats { products: number; orders: number; categories: number; revenue: number; }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, categories: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ count: products }, { count: orders }, { count: categories }, { data: ordersData }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (ordersData || []).reduce((s, o) => s + (o.amount_paid ?? 0), 0);
      setStats({ products: products ?? 0, orders: orders ?? 0, categories: categories ?? 0, revenue });
      setRecentOrders(ordersData || []);
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { icon: Package, label: "Products", value: stats.products, color: "bg-blue-50 text-blue-600", link: "/admin/products" },
    { icon: ShoppingBag, label: "Orders", value: stats.orders, color: "bg-green-50 text-green-600", link: "/admin/orders" },
    { icon: Tag, label: "Categories", value: stats.categories, color: "bg-purple-50 text-purple-600", link: "/admin/categories" },
    { icon: TrendingUp, label: "Revenue", value: formatPrice(stats.revenue), color: "bg-red-50 text-brand", link: "/admin/orders" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back! Here's your store overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color, link }) => (
          <Link key={label} to={link} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{loading ? "—" : value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-brand hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : recentOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-brand text-sm">{formatPrice(order.amount_paid ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
