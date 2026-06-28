import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Minus, Plus, CheckCircle, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VariantSelector from "@/components/features/VariantSelector";
import { supabase } from "@/lib/supabase";
import { Product, ProductVariant, ProductImage } from "@/types";
import { useCart } from "@/stores/cartStore";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, setIsOpen } = useCart();
  const { format } = useCurrencyFormat();
  const [product, setProduct] = useState<Product | null>(null);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      supabase.from("products").select("*, variants:product_variants(*)").eq("id", id).eq("is_active", true).single(),
      supabase.from("product_images").select("*").eq("product_id", id).order("display_order"),
    ]).then(([{ data: prod, error: prodError }, { data: imgs }]) => {
      if (prodError) console.error("Product fetch error:", prodError);
      setProduct(prod);
      setGalleryImages(imgs || []);
      setLoading(false);
      if (prod?.variants?.length) setSelectedVariant(prod.variants[0]);
    });
  }, [id]);

  // All images: main image first, then gallery
  const allImages = (() => {
    const imgs: string[] = [];
    if (product?.image_url) imgs.push(product.image_url);
    galleryImages.forEach((g) => { if (!imgs.includes(g.image_url)) imgs.push(g.image_url); });
    return imgs;
  })();

  const price = selectedVariant ? selectedVariant.price : product?.base_price ?? null;

  const handleAddToCart = () => {
    if (!product) return;
    if (product.has_variants && !selectedVariant) { toast.error("Please select a variant"); return; }
    addItem(product, selectedVariant, quantity);
    setAdded(true);
    toast.success("Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  };

  const prev = () => setActiveIdx((i) => (i === 0 ? allImages.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === allImages.length - 1 ? 0 : i + 1));

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
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main viewer */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted group">
              {allImages.length > 0 ? (
                <img src={allImages[activeIdx]} alt={product.title} className="w-full h-full object-cover transition-opacity duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-24 h-24 text-muted-foreground/20" /></div>
              )}
              {allImages.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 glass flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 glass flex items-center justify-center shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => setActiveIdx(i)}
                        className={cn("w-2 h-2 rounded-full transition-all", i === activeIdx ? "bg-brand w-4" : "bg-white/70")} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((src, i) => (
                  <button key={i} onClick={() => setActiveIdx(i)}
                    className={cn("shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      i === activeIdx ? "border-brand" : "border-transparent hover:border-border")}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
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
                className={cn("flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all",
                  added ? "bg-green-600 text-white" : "brand-gradient text-brand-foreground hover:opacity-90")}>
                {added ? <><CheckCircle className="w-5 h-5" /> Added!</> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
              </button>
              <button onClick={() => { handleAddToCart(); setIsOpen(true); }}
                className="px-5 py-3.5 rounded-xl border-2 border-foreground font-semibold hover:bg-foreground hover:text-white transition-all">
                Buy Now
              </button>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                    <Tag className="w-3 h-3" />#{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
