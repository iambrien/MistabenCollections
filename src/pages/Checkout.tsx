import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ShoppingBag, Loader2, MapPin, Globe, User, Phone,
  Mail, Home, CreditCard, Truck, Package, ChevronRight, Info
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useCart } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useCurrency } from "@/stores/currencyStore";
import { DeliveryZone } from "@/types";
import { cn } from "@/lib/utils";

const INTL_SHIPPING_NGN = 7.8 * 1590; // $7.80 at ~1,590 NGN/USD

// Nigerian banks for mobile money/bank transfer
const NIGERIAN_BANKS = [
  "Access Bank", "First Bank", "GTBank", "Zenith Bank", "UBA",
  "Opay", "Palmpay", "Kuda Bank", "Moniepoint", "Sterling Bank",
  "FCMB", "Union Bank", "Ecobank", "Fidelity Bank", "Polaris Bank",
];

type Step = "info" | "delivery" | "payment" | "review";

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "info", label: "Info", icon: User },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: Package },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { format } = useCurrencyFormat();
  const { currency } = useCurrency();

  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);

  // Step 1 — Personal info
  const [info, setInfo] = useState({
    firstName: "", lastName: "", email: "", phone: "",
  });

  // Step 2 — Delivery
  const [isNigeria, setIsNigeria] = useState(true);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [selectedState, setSelectedState] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [houseAddress, setHouseAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [nationality, setNationality] = useState("Nigerian");

  // Step 3 — Payment
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "mobile_money">("bank_transfer");
  const [selectedBank, setSelectedBank] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true).order("state").order("city")
      .then(({ data }) => setZones(data || []));
  }, []);

  const states = [...new Set(zones.map((z) => z.state))].sort();
  const citiesForState = zones.filter((z) => z.state === selectedState);
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const deliveryFeeNGN = deliveryType === "pickup" ? 0
    : isNigeria ? (selectedZone?.rate ?? 0) : INTL_SHIPPING_NGN;
  const grandTotalNGN = totalPrice + deliveryFeeNGN;

  // Step validation
  const canGoNext = (): boolean => {
    if (step === "info") return !!(info.firstName && info.lastName && info.phone);
    if (step === "delivery") {
      if (deliveryType === "pickup") return true;
      if (!houseAddress.trim()) return false;
      if (isNigeria && !selectedZoneId) return false;
      return true;
    }
    if (step === "payment") return true;
    return true;
  };

  const nextStep = () => {
    if (!canGoNext()) { toast.error("Please fill in all required fields"); return; }
    const order: Step[] = ["info", "delivery", "payment", "review"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1] as Step);
  };

  const prevStep = () => {
    const order: Step[] = ["info", "delivery", "payment", "review"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1] as Step);
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error("Your cart is empty"); return; }
    setLoading(true);

    const deliveryInfo = deliveryType === "pickup"
      ? "Store Pickup"
      : isNigeria
        ? `${houseAddress}${zipCode ? ", " + zipCode : ""}, ${selectedZone?.city}, ${selectedZone?.state}, Nigeria`
        : `${houseAddress}${zipCode ? ", " + zipCode : ""} — International`;

    const { error: orderError } = await supabase.from("orders").insert({
      customer_name: `${info.firstName} ${info.lastName}`,
      customer_firstname: info.firstName,
      customer_lastname: info.lastName,
      customer_phone: info.phone,
      customer_email: info.email || null,
      customer_address: deliveryInfo,
      customer_zip: zipCode || null,
      customer_nationality: nationality || null,
      delivery_type: deliveryType,
      delivery_state: isNigeria ? selectedZone?.state ?? null : null,
      delivery_city: isNigeria ? selectedZone?.city ?? null : null,
      payment_method: paymentMethod,
      payment_reference: paymentRef || null,
      notes: notes || null,
      amount_paid: grandTotalNGN,
      status: "pending",
    });

    if (orderError) {
      toast.error("Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_phone", info.phone)
      .eq("customer_name", `${info.firstName} ${info.lastName}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!order) {
      toast.error("Order placed but could not retrieve ID.");
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
      variant_info: item.variant
        ? [item.variant.color, item.variant.size].filter(Boolean).join(" · ")
        : null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) toast.error("Order placed but items failed to save.");

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

  const stepIndex = ["info", "delivery", "payment", "review"].indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8">
        <Link to="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>

        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                    done ? "bg-brand border-brand text-white" :
                    active ? "bg-white border-brand text-brand" :
                    "bg-white border-border text-muted-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn("text-[10px] font-medium hidden sm:block", active ? "text-brand" : done ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-2 rounded-full transition-all", done ? "bg-brand" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left form */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── STEP 1: Personal Info ── */}
            {step === "info" && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h2 className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-brand" /> Personal Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name *</label>
                    <input value={info.firstName} onChange={(e) => setInfo((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="First name"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-background transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name *</label>
                    <input value={info.lastName} onChange={(e) => setInfo((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Last name"
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-background transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                    <Phone className="w-3 h-3" /> Phone / WhatsApp *
                  </label>
                  <input type="tel" value={info.phone} onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+234 XX XXXX XXXX"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-background transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                    <Mail className="w-3 h-3" /> Email (optional)
                  </label>
                  <input type="email" value={info.email} onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-background transition-all" />
                </div>
              </div>
            )}

            {/* ── STEP 2: Delivery ── */}
            {step === "delivery" && (
              <div className="space-y-4">
                {/* Delivery vs Pickup */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h2 className="font-semibold mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-brand" /> Delivery / Pickup</h2>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(["delivery", "pickup"] as const).map((t) => (
                      <button key={t} onClick={() => setDeliveryType(t)}
                        className={cn("py-2.5 rounded-xl border text-sm font-medium transition-all capitalize",
                          deliveryType === t ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                        {t === "delivery" ? "🚚 Delivery" : "🏪 Store Pickup"}
                      </button>
                    ))}
                  </div>

                  {deliveryType === "pickup" && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                      <p className="font-medium">Pickup Info</p>
                      <p className="text-xs text-blue-600 mt-0.5">You'll be contacted via WhatsApp with the pickup address and time.</p>
                    </div>
                  )}

                  {deliveryType === "delivery" && (
                    <div className="space-y-3">
                      {/* Nigeria / International */}
                      <div className="flex gap-2">
                        <button onClick={() => { setIsNigeria(true); setSelectedState(""); setSelectedZoneId(""); }}
                          className={cn("flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                            isNigeria ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                          🇳🇬 Nigeria
                        </button>
                        <button onClick={() => { setIsNigeria(false); setSelectedState(""); setSelectedZoneId(""); }}
                          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all",
                            !isNigeria ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                          <Globe className="w-3.5 h-3.5" /> International
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1 block">
                          <Home className="w-3 h-3" /> House / Street Address *
                        </label>
                        <input value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)}
                          placeholder="House No., Street Name, Landmark"
                          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-background transition-all" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Zip / Postal Code</label>
                          <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="Optional"
                            className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-background transition-all" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nationality</label>
                          <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Nigerian"
                            className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-background transition-all" />
                        </div>
                      </div>

                      {isNigeria ? (
                        <div className="space-y-2">
                          <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedZoneId(""); }}
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                            <option value="">Select State *</option>
                            {states.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {selectedState && (
                            <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                              <option value="">Select City / Area *</option>
                              {citiesForState.map((z) => (
                                <option key={z.id} value={z.id}>{z.city} — {format(z.rate)}</option>
                              ))}
                            </select>
                          )}
                          {selectedZone && (
                            <div className="flex items-center justify-between p-3 bg-brand/5 border border-brand/20 rounded-xl text-sm">
                              <span className="text-muted-foreground">Delivery to {selectedZone.city}</span>
                              <span className="font-bold text-brand">{format(selectedZone.rate)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-blue-800">International Shipping</p>
                            <p className="text-xs text-blue-600 mt-0.5">Flat rate $7.80 USD</p>
                          </div>
                          <span className="font-bold text-blue-700">{format(INTL_SHIPPING_NGN)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === "payment" && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h2 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand" /> Payment Method</h2>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Pay via bank transfer or mobile money. Send payment to our account, then enter your reference number below.
                    Your order will be confirmed once payment is verified.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["bank_transfer", "mobile_money"] as const).map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={cn("py-3 px-3 rounded-xl border text-sm font-medium transition-all text-center",
                        paymentMethod === m ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                      {m === "bank_transfer" ? "🏦 Bank Transfer" : "📱 Mobile Money"}
                    </button>
                  ))}
                </div>

                {/* Bank account details */}
                <div className="bg-muted/60 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {paymentMethod === "bank_transfer" ? "Bank Transfer Details" : "Mobile Money Details"}
                  </p>
                  <p className="text-sm"><span className="text-muted-foreground">Account Name:</span> <span className="font-semibold">Mistaben Collections</span></p>
                  <p className="text-sm"><span className="text-muted-foreground">Account No:</span> <span className="font-mono font-bold tracking-wider">0123456789</span></p>
                  <p className="text-sm"><span className="text-muted-foreground">Bank:</span> <span className="font-semibold">GTBank</span></p>
                  {paymentMethod === "mobile_money" && (
                    <p className="text-sm"><span className="text-muted-foreground">Phone (Opay/Palmpay):</span> <span className="font-semibold">+234 801 234 5678</span></p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Transfer exactly <span className="text-brand font-semibold">{format(grandTotalNGN)}</span> and enter your reference below.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Reference / Transaction ID (optional)</label>
                  <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. GTB2406291234"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 bg-background transition-all" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Which bank / app did you use?</label>
                  <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                    <option value="">Select bank (optional)</option>
                    {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Order Notes (optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Any special instructions or delivery notes..."
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 bg-background resize-none transition-all" />
                </div>
              </div>
            )}

            {/* ── STEP 4: Review ── */}
            {step === "review" && (
              <div className="space-y-4">
                <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
                  <div className="px-5 py-3 bg-muted/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Summary</p>
                  </div>
                  <div className="px-5 py-3 grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{info.firstName} {info.lastName}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{info.phone}</p></div>
                    {info.email && <div className="col-span-2"><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{info.email}</p></div>}
                  </div>
                  <div className="px-5 py-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-0.5">Delivery</p>
                    <p className="font-medium">
                      {deliveryType === "pickup" ? "Store Pickup"
                        : isNigeria
                          ? `${houseAddress}, ${selectedZone?.city}, ${selectedZone?.state}`
                          : `International — ${houseAddress}`}
                    </p>
                    {zipCode && <p className="text-xs text-muted-foreground">Zip: {zipCode}</p>}
                  </div>
                  <div className="px-5 py-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-0.5">Payment</p>
                    <p className="font-medium capitalize">{paymentMethod.replace("_", " ")}{selectedBank ? ` — ${selectedBank}` : ""}</p>
                    {paymentRef && <p className="text-xs text-muted-foreground font-mono mt-0.5">Ref: {paymentRef}</p>}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
                  <p className="font-semibold mb-1">⚠ Before placing your order</p>
                  <p>Make sure you have transferred <span className="font-bold text-brand">{format(grandTotalNGN)}</span> to the account shown in the payment step. Your order will be processed after payment confirmation.</p>
                </div>

                <button onClick={handleSubmit} disabled={loading}
                  className="w-full brand-gradient text-brand-foreground py-4 rounded-2xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</>
                    : <>Place Order — {format(grandTotalNGN)} <ChevronRight className="w-5 h-5" /></>}
                </button>
              </div>
            )}

            {/* Navigation buttons */}
            {step !== "review" && (
              <div className="flex gap-3">
                {step !== "info" && (
                  <button onClick={prevStep}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-sm font-medium hover:bg-muted transition-colors">
                    ← Back
                  </button>
                )}
                <button onClick={nextStep} disabled={!canGoNext()}
                  className="flex-1 brand-gradient text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {step === "review" && step !== "review" && null}
            {step !== "info" && step === "review" && (
              <button onClick={prevStep} className="w-full py-3 rounded-xl border-2 border-border text-sm font-medium hover:bg-muted transition-colors">
                ← Back to Payment
              </button>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border overflow-hidden sticky top-20">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand" />
                  Order Summary ({items.length} item{items.length > 1 ? "s" : ""})
                </p>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.cartId} className="flex gap-2.5 p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.product.image_url
                        ? <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.product.title}</p>
                      {item.variant && <p className="text-[10px] text-muted-foreground">{[item.variant.color, item.variant.size].filter(Boolean).join(" · ")}</p>}
                      <p className="text-[10px] text-muted-foreground">×{item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-brand shrink-0">{format(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 space-y-2 border-t border-border">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{format(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  {deliveryType === "pickup" ? (
                    <span className="text-green-600 font-medium">Free (Pickup)</span>
                  ) : (deliveryFeeNGN > 0) ? (
                    <span className="font-medium text-brand">{format(deliveryFeeNGN)}</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Select location</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground italic">
                  Showing prices in {currency.label} ({currency.symbol})
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                  <span>Total</span>
                  <span className="text-brand">{format(grandTotalNGN)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
