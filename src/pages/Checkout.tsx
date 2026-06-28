import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useCart } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { format } = useCurrencyFormat();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) { toast.error("Please fill in all required fields"); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    setLoading(true);

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: form.address,
      notes: form.notes || null,
      amount_paid: totalPrice,
      status: "pending",
    }).select().single();

    if (orderError || !order) {
      toast.error("Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      variant_id: item.variant?.id ?? null,
      quantity: item.quantity,
      price: item.price,
      product_title: item.product.title,
      variant_info: item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(" · ") : null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      toast.error("Order placed but items failed to save. Contact support.");
    }

    clearCart();
    navigate(`/order-confirmation?orderId=${order.id}`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">Your cart is empty</p>
          <Link to="/products" className="brand-gradient text-brand-foreground px-6 py-2.5 rounded-xl font-semibold hover:opacity-90">Shop Now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <Link to="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
        <h1 className="text-2xl font-bold mb-8">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="order-2 lg:order-1">
            <h2 className="font-semibold text-lg mb-4">Your Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { name: "name", label: "Full Name *", type: "text", placeholder: "Your full name" },
                { name: "phone", label: "Phone / WhatsApp *", type: "tel", placeholder: "+233 XX XXX XXXX" },
                { name: "address", label: "Delivery Address *", type: "text", placeholder: "Street, City, Region" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                  <input name={f.name} type={f.type} placeholder={f.placeholder} value={form[f.name as keyof typeof form]} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1.5">Order Notes (optional)</label>
                <textarea name="notes" rows={3} placeholder="Any special instructions..." value={form.notes} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm resize-none" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full brand-gradient text-brand-foreground py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</> : "Place Order"}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="order-1 lg:order-2">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {items.map((item) => (
                <div key={item.cartId} className="flex gap-3 p-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.title}</p>
                    {item.variant && <p className="text-xs text-muted-foreground">{[item.variant.color, item.variant.size].filter(Boolean).join(" · ")}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-brand shrink-0">{format(item.price * item.quantity)}</p>
                </div>
              ))}
              <div className="p-4 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl text-brand">{format(totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
