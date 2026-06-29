import { useEffect, useState } from "react";
import { Search, Eye, X, MessageCircle, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Order, OrderItem } from "@/types";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const UNREAD_KEY = "mistaben_unread_orders";

// Statuses that mean the order is fulfilled — reduce stock when entering these
const FULFIL_STATUSES = new Set(["shipped", "delivered"]);

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const settings = JSON.parse(localStorage.getItem("mistaben_settings") || "{}");

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // Mark all notifications as read when orders panel is opened
    try {
      const stored = localStorage.getItem(UNREAD_KEY);
      if (stored) {
        const notifs = JSON.parse(stored);
        const updated = notifs.map((n: { read: boolean }) => ({ ...n, read: true }));
        localStorage.setItem(UNREAD_KEY, JSON.stringify(updated));
      }
    } catch (_) {}
    // Clear badge
    try {
      if ("clearAppBadge" in navigator) {
        (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge();
      }
    } catch (_) {}
  }, []);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);
    setOrderItems(data || []);
  };

  /** Decrement stock for each variant in the order when fulfilling */
  const decrementStock = async (items: OrderItem[]) => {
    for (const item of items) {
      if (!item.variant_id) continue;
      // Use rpc-style update: fetch current stock then decrement
      const { data: variant } = await supabase
        .from("product_variants")
        .select("stock")
        .eq("id", item.variant_id)
        .single();
      if (!variant) continue;
      const newStock = Math.max(0, (variant.stock ?? 0) - item.quantity);
      await supabase
        .from("product_variants")
        .update({ stock: newStock })
        .eq("id", item.variant_id);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const prevOrder = orders.find((o) => o.id === orderId);
    const prevStatus = prevOrder?.status ?? "";

    setUpdatingStatus(true);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) { toast.error("Failed to update status"); setUpdatingStatus(false); return; }

    // Reduce stock only when transitioning INTO a fulfilment status for the first time
    const wasAlreadyFulfilled = FULFIL_STATUSES.has(prevStatus);
    const isNowFulfilled = FULFIL_STATUSES.has(newStatus);
    if (isNowFulfilled && !wasAlreadyFulfilled && orderItems.length > 0) {
      await decrementStock(orderItems);
      toast.success(`Status updated to "${newStatus}" — stock deducted`);
    } else {
      toast.success("Status updated");
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder?.id === orderId)
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    setUpdatingStatus(false);
  };

  const filtered = orders.filter((o) =>
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_phone.includes(search) ||
    o.id.includes(search)
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or ID..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => openOrder(order)}
              >
                <div>
                  <p className="text-sm font-semibold">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.customer_phone} · {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-brand text-sm">{formatPrice(order.amount_paid ?? 0)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openOrder(order); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold">Order Details</h2>
                <p className="text-xs text-muted-foreground">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Name", selectedOrder.customer_name],
                  ["Phone", selectedOrder.customer_phone],
                  ["Address", selectedOrder.customer_address],
                  ["Date", formatDate(selectedOrder.created_at)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-sm font-medium break-words">{v}</p>
                  </div>
                ))}
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status Update */}
              <div>
                <p className="text-sm font-semibold mb-1.5">Update Status</p>
                <select
                  value={selectedOrder.status}
                  disabled={updatingStatus}
                  onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                {(selectedOrder.status === "shipped" || selectedOrder.status === "delivered") && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Stock has been deducted for fulfilled variants
                  </p>
                )}
              </div>

              {/* Order Items */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide">Items</p>
                </div>
                {orderItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No items found</div>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center px-3 py-2.5 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.product_title}</p>
                        {item.variant_info && <p className="text-xs text-muted-foreground">{item.variant_info}</p>}
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-brand ml-3 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))
                )}
                <div className="px-3 py-2.5 flex justify-between border-t border-border bg-muted/20">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-bold text-brand">{formatPrice(selectedOrder.amount_paid ?? 0)}</span>
                </div>
              </div>

              {settings.whatsappNumber && (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> Contact Customer via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
