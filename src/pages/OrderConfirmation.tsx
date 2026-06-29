import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ShoppingBag, MessageCircle, ArrowRight, ExternalLink } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { formatDate } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

// Admin WhatsApp number - read from settings
function getAdminWhatsapp(): string {
  try {
    const s = JSON.parse(localStorage.getItem("mistaben_settings") || "{}");
    return (s.whatsappNumber || "").replace(/\D/g, "");
  } catch {
    return "";
  }
}

function buildAdminWhatsappMessage(order: Order, items: Order["order_items"], formattedTotal: string): string {
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const itemLines = (items || [])
    .map((item) => `  • ${item.product_title}${item.variant_info ? ` (${item.variant_info})` : ""} × ${item.quantity}`)
    .join("\n");

  const msg =
    `🛍️ *NEW ORDER — Mistaben Collections*\n` +
    `Order #${orderNum}\n\n` +
    `👤 *Customer:* ${order.customer_name}\n` +
    `📞 *Phone:* ${order.customer_phone}\n` +
    `📍 *Address:* ${order.customer_address}\n\n` +
    `🛒 *Items:*\n${itemLines || "  (no items)"}\n\n` +
    `💰 *Total: ${formattedTotal}*\n\n` +
    `Reply to confirm delivery. ✅`;

  return encodeURIComponent(msg);
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [waOpened, setWaOpened] = useState(false);
  const { format } = useCurrencyFormat();

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data);
      });
  }, [orderId]);

  // Auto-open WhatsApp notification to admin once order is loaded
  useEffect(() => {
    if (!order || waOpened) return;
    const adminNum = getAdminWhatsapp();
    if (!adminNum) return;

    const msg = buildAdminWhatsappMessage(order, order.order_items, format(order.amount_paid ?? 0));
    const waUrl = `https://wa.me/${adminNum}?text=${msg}`;

    // Brief delay so user sees confirmation first
    const t = setTimeout(() => {
      window.open(waUrl, "_blank", "noopener,noreferrer");
      setWaOpened(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [order]);

  const adminWhatsappUrl = order
    ? (() => {
        const adminNum = getAdminWhatsapp();
        if (!adminNum) return null;
        const msg = buildAdminWhatsappMessage(order, order.order_items, format(order.amount_paid ?? 0));
        return `https://wa.me/${adminNum}?text=${msg}`;
      })()
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Success header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground">Thank you for your order. We'll be in touch shortly.</p>
          {order && (
            <p className="text-sm text-muted-foreground mt-1">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        {/* WhatsApp notification info */}
        {adminWhatsappUrl && (
          <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800">WhatsApp Notification Sent</p>
              <p className="text-xs text-green-700 mt-0.5">
                Your order details were sent to the store via WhatsApp.
                {!waOpened && " If it didn't open automatically, tap the button below."}
              </p>
            </div>
            {!waOpened && (
              <a
                href={adminWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWaOpened(true)}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Send <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Order details */}
        {order && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Order Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
            </div>
            <div className="divide-y divide-border">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.product_title}</p>
                    {item.variant_info && (
                      <p className="text-xs text-muted-foreground">{item.variant_info}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-brand">{format(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-between">
              <span className="font-bold">Total Paid</span>
              <span className="font-bold text-brand text-lg">{format(order.amount_paid ?? 0)}</span>
            </div>
          </div>
        )}

        {/* Customer info */}
        {order && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Delivery Info</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{order.customer_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{order.customer_phone}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{order.customer_address}</p></div>
            </div>
          </div>
        )}

        {/* Manual WhatsApp button fallback */}
        {adminWhatsappUrl && (
          <a
            href={adminWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setWaOpened(true)}
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition-colors mb-4 text-sm"
          >
            <MessageCircle className="w-5 h-5" />
            Resend Order via WhatsApp
          </a>
        )}

        {!adminWhatsappUrl && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
            <span className="font-semibold">Admin tip:</span> Add your WhatsApp number in Admin → Settings to enable automatic order notifications.
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border font-medium hover:bg-muted transition-colors text-sm">
            Back to Home
          </Link>
          <Link to="/products" className="flex-1 flex items-center justify-center gap-2 brand-gradient text-brand-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm">
            Shop More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
