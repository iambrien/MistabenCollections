import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Minus, Plus, CheckCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VariantSelector from "@/components/features/VariantSelector";
import { supabase } from "@/lib/supabase";
import { Product, ProductVariant } from "@/types";
import { useCart } from "@/stores/cartStore";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, setIsOpen } = useCart();
  const { format } = useCurrencyFormat();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*, variants:product_variants(*)").eq("id", id).single()
      .then(({ data }) => { setProduct(data); setLoading(false); if (data?.variants?.length) setSelectedVariant(data.variants[0]); });
  }, [id]);

  const price = selectedVariant ? selectedVariant.price : product?.base_price ?? null;

  const handleAddToCart = () => {
    if (!product) return;
    if (product.has_variants && !selectedVariant) { toast.error("Please select a variant"); return; }
    addItem(product, selectedVariant, quantity);
    setAdded(true);
    toast.success("Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-muted-foreground">Product not found</div></div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-24 h-24 text-muted-foreground/20" /></div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold leading-tight">{product.title}</h1>
              {price !== null && (
                <p className="text-3xl font-extrabold text-brand mt-2">{format(price)}</p>
              )}
            </div>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {product.has_variants && product.variants && product.variants.length > 0 && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <VariantSelector variants={product.variants} selected={selectedVariant} onSelect={setSelectedVariant} />
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold mb-2">Quantity</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-semibold text-lg">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all ${added ? "bg-green-600 text-white" : "brand-gradient text-brand-foreground hover:opacity-90"}`}>
                {added ? <><CheckCircle className="w-5 h-5" /> Added!</> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
              </button>
              <button onClick={() => { handleAddToCart(); setIsOpen(true); }}
                className="px-5 py-3.5 rounded-xl border-2 border-foreground font-semibold hover:bg-foreground hover:text-white transition-all">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
