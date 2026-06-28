import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ShoppingBag, MessageCircle, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types";
import { formatDate } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const settings = JSON.parse(localStorage.getItem("mistaben_settings") || "{}");
  const { format } = useCurrencyFormat();

  useEffect(() => {
    if (!orderId) return;
    supabase.from("orders").select("*, order_items(*)").eq("id", orderId).single()
      .then(({ data }) => setOrder(data));
  }, [orderId]);

  const whatsappMessage = order
    ? encodeURIComponent(`Hi! I just placed Order #${order.id.slice(0, 8).toUpperCase()} on Mistaben Collections.\n\nTotal: ${format(order.amount_paid ?? 0)}\nName: ${order.customer_name}\nPhone: ${order.customer_phone}\nAddress: ${order.customer_address}`)
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground">Thank you for your order. We'll be in touch shortly.</p>
          {order && <p className="text-sm text-muted-foreground mt-1">Order #{order.id.slice(0, 8).toUpperCase()}</p>}
        </div>

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
                    {item.variant_info && <p className="text-xs text-muted-foreground">{item.variant_info}</p>}
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

        {settings.whatsappNumber && (
          <a href={`https://wa.me/${settings.whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-semibold transition-colors mb-4">
            <MessageCircle className="w-5 h-5" />
            Send Order via WhatsApp
          </a>
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
