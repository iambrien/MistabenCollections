import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Loader2, MapPin, Globe } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useCart } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useCurrency } from "@/stores/currencyStore";
import { DeliveryZone } from "@/types";
import { cn } from "@/lib/utils";

// International shipping flat rate: $7.80 USD → convert to NGN first, then to selected currency
const INTL_SHIPPING_NGN = 7.8 * 1590; // $7.80 at ~1,590 NGN/USD = ~12,402 NGN

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { format } = useCurrencyFormat();
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });

  const [isNigeria, setIsNigeria] = useState(true);
  const [selectedState, setSelectedState] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true).order("state").order("city")
      .then(({ data }) => setZones(data || []));
  }, []);

  const states = [...new Set(zones.map(z => z.state))].sort();
  const citiesForState = zones.filter(z => z.state === selectedState);
  const selectedZone = zones.find(z => z.id === selectedZoneId) ?? null;

  // Delivery fee: always stored/calculated in NGN, displayed via format() which converts automatically
  const deliveryFeeNGN = isNigeria
    ? (selectedZone?.rate ?? 0)
    : INTL_SHIPPING_NGN;

  const grandTotalNGN = totalPrice + deliveryFeeNGN;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) { toast.error("Please fill in all required fields"); return; }
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    if (isNigeria && !selectedZoneId) { toast.error("Please select your delivery city"); return; }
    setLoading(true);

    const deliveryInfo = isNigeria
      ? `${selectedZone?.city}, ${selectedZone?.state}, Nigeria`
      : "International Delivery";

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: `${form.address} — ${deliveryInfo}`,
      notes: form.notes || null,
      amount_paid: grandTotalNGN, // stored in NGN
      status: "pending",
    }).select().single();

    if (orderError || !order) {
      toast.error("Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      variant_id: item.variant?.id ?? null,
      quantity: item.quantity,
      price: item.price,
      product_title: item.product.title,
      variant_info: item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(" · ") : null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) toast.error("Order placed but items failed to save. Contact support.");

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
          <div className="order-2 lg:order-1 space-y-6">
            <div>
              <h2 className="font-semibold text-lg mb-4">Your Details</h2>
              <div className="space-y-4">
                {[
                  { name: "name", label: "Full Name *", type: "text", placeholder: "Your full name" },
                  { name: "phone", label: "Phone / WhatsApp *", type: "tel", placeholder: "+234 XX XXXX XXXX" },
                  { name: "address", label: "Street Address *", type: "text", placeholder: "House No., Street, Landmark" },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                    <input name={f.name} type={f.type} placeholder={f.placeholder}
                      value={form[f.name as keyof typeof form]} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Location */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> Delivery Location</h2>

              <div className="flex gap-2 mb-4">
                <button onClick={() => { setIsNigeria(true); setSelectedState(""); setSelectedZoneId(""); }}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    isNigeria ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                  🇳🇬 Nigeria
                </button>
                <button onClick={() => { setIsNigeria(false); setSelectedState(""); setSelectedZoneId(""); }}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    !isNigeria ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                  <Globe className="w-4 h-4" /> International
                </button>
              </div>

              {isNigeria ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select State *</label>
                    <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedZoneId(""); }}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                      <option value="">Choose your state…</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {selectedState && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select City / Area *</label>
                      <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                        <option value="">Choose your city…</option>
                        {citiesForState.map(z => (
                          <option key={z.id} value={z.id}>{z.city}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedZone && (
                    <div className="flex items-center justify-between p-3 bg-brand/5 border border-brand/20 rounded-xl">
                      <span className="text-sm text-muted-foreground">Delivery to {selectedZone.city}</span>
                      <span className="text-sm font-bold text-brand">{format(selectedZone.rate)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">International Shipping</p>
                      <p className="text-xs text-blue-600 mt-0.5">Flat rate — $7.80 USD equivalent</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{format(INTL_SHIPPING_NGN)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Order Notes (optional)</label>
              <textarea name="notes" rows={3} placeholder="Any special instructions..." value={form.notes} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all text-sm resize-none" />
            </div>

            <button type="submit" onClick={handleSubmit} disabled={loading}
              className="w-full brand-gradient text-brand-foreground py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</> : "Place Order"}
            </button>
          </div>

          {/* Order Summary */}
          <div className="order-1 lg:order-2">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {items.map(item => (
                <div key={item.cartId} className="flex gap-3 p-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.product.image_url
                      ? <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.title}</p>
                    {item.variant && <p className="text-xs text-muted-foreground">{[item.variant.color, item.variant.size].filter(Boolean).join(" · ")}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-brand shrink-0">{format(item.price * item.quantity)}</p>
                </div>
              ))}

              <div className="px-4 py-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{format(totalPrice)}</span>
              </div>

              <div className="px-4 py-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                {(isNigeria && !selectedZoneId) ? (
                  <span className="text-muted-foreground italic text-xs">Select location</span>
                ) : (
                  <span className="font-medium text-brand">{format(deliveryFeeNGN)}</span>
                )}
              </div>

              <div className="px-4 py-3 text-xs text-muted-foreground italic">
                Prices shown in {currency.label} ({currency.symbol})
              </div>

              <div className="p-4 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl text-brand">{format(grandTotalNGN)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
