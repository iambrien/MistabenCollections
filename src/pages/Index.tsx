import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/features/ProductCard";
import { supabase } from "@/lib/supabase";
import { Product, Category } from "@/types";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const settings = JSON.parse(localStorage.getItem("mistaben_settings") || "{}");
  const storeName = settings.storeName || "Mistaben Collections";
  const tagline = settings.storeTagline || "Elevate Your Style";

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*, variants:product_variants(*)").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("categories").select("*").limit(6),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[85vh] min-h-[500px] overflow-hidden">
          <img src={heroBanner} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 h-full flex items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-xl animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-brand" />
                <span className="text-sm font-medium text-white/70 uppercase tracking-widest">New Collection</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-none tracking-tight mb-4">
                {tagline}
              </h1>
              <p className="text-white/70 text-lg mb-8 leading-relaxed max-w-md">
                Discover premium pieces curated for the modern aesthetic. Unique styles, exceptional quality.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/products"
                  className="inline-flex items-center gap-2 brand-gradient text-brand-foreground px-7 py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-xl font-bold mb-5">Shop by Category</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              <Link to="/products"
                className="shrink-0 px-5 py-2.5 rounded-full bg-foreground text-white text-sm font-medium hover:opacity-80 transition-opacity">
                All
              </Link>
              {categories.map((cat) => (
                <Link key={cat.id} to={`/products?category=${cat.id}`}
                  className="shrink-0 px-5 py-2.5 rounded-full bg-white border border-border text-sm font-medium hover:border-brand hover:text-brand transition-all">
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link to="/products" className="text-sm text-brand font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[4/5]" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No products yet. Check back soon!</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
