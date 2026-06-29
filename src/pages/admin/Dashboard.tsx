import { useEffect, useState } from "react";
import { Package, ShoppingBag, Tag, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Stats { products: number; orders: number; categories: number; revenue: number; }
interface LowStockVariant { id: string; product_title: string; color: string | null; size: string | null; stock: number; }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, categories: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: products },
        { count: orders },
        { count: categories },
        { data: ordersData },
        { data: variantsData },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase
          .from("product_variants")
          .select("id, product_id, color, size, stock, products(title)")
          .lt("stock", 5)
          .order("stock", { ascending: true })
          .limit(10),
      ]);

      const revenue = (ordersData || []).reduce((s, o) => s + (o.amount_paid ?? 0), 0);
      setStats({ products: products ?? 0, orders: orders ?? 0, categories: categories ?? 0, revenue });
      setRecentOrders(ordersData || []);

      const mapped: LowStockVariant[] = (variantsData || []).map((v) => ({
        id: v.id,
        product_title: (v.products as { title?: string } | null)?.title ?? "Unknown Product",
        color: v.color,
        size: v.size,
        stock: v.stock ?? 0,
      }));
      setLowStock(mapped);
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

      {/* Low Stock Warning Banner */}
      {!loading && lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-200/70">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {lowStock.length} variant{lowStock.length > 1 ? "s" : ""} running low on stock
              </p>
              <p className="text-xs text-amber-700 mt-0.5">Restock these soon to avoid selling out</p>
            </div>
            <Link
              to="/admin/products?filter=low-stock"
              className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-amber-100/80">
            {lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">{v.product_title}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {[v.color, v.size].filter(Boolean).join(" · ") || "Default variant"}
                  </p>
                </div>
                <span className={`shrink-0 ml-3 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  v.stock === 0
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}>
                  {v.stock === 0 ? "Out of stock" : `${v.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
