import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown, ArrowUpDown } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/features/ProductCard";
import { supabase } from "@/lib/supabase";
import { Product, Category } from "@/types";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "name_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "name_asc", label: "Name: A → Z" },
];

function getProductPrice(p: Product): number {
  if (p.has_variants && p.variants && p.variants.length > 0) {
    return Math.min(...p.variants.map((v) => v.price));
  }
  return p.base_price ?? 0;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Products() {
  const { format } = useCurrencyFormat();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState(searchParams.get("search") || searchParams.get("q") || "");
  const debouncedSearch = useDebounce(search, 300);
  // Pre-select category by name (from navbar search click)
  const [pendingCategoryName] = useState(searchParams.get("category") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Fetch all data once
  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: products }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*, variants:product_variants(*)").eq("is_active", true),
        supabase.from("categories").select("*").order("name"),
      ]);
      const prods = products || [];
      setAllProducts(prods);
      setCategories(cats || []);
      // Resolve category name → id if coming from navbar
    if (pendingCategoryName && cats) {
      const matched = cats.find((c) => c.name.toLowerCase() === pendingCategoryName.toLowerCase());
      if (matched) setSelectedCategories([matched.id]);
    }
    if (prods.length > 0) {
        const top = Math.max(...prods.map(getProductPrice));
        const ceiling = Math.ceil(top / 100) * 100 || 10000;
        setMaxPrice(ceiling);
        setPriceRange([0, ceiling]);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedCategories.length === 1) params.category = selectedCategories[0];
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedCategories]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter + Sort (client-side, instant)
  const filtered = useMemo(() => {
    let list = allProducts;

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // Price range
    list = list.filter((p) => {
      const price = getProductPrice(p);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Categories (multi-select)
    if (selectedCategories.length > 0) {
      list = list.filter((p) => {
        if (!p.product_categories) return false;
        return p.product_categories.some((pc) => selectedCategories.includes(pc.category_id));
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price_asc": return getProductPrice(a) - getProductPrice(b);
        case "price_desc": return getProductPrice(b) - getProductPrice(a);
        case "name_asc": return a.title.localeCompare(b.title);
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return list;
  }, [allProducts, debouncedSearch, priceRange, selectedCategories, sort]);

  // Fetch product_categories join for category filtering
  useEffect(() => {
    if (selectedCategories.length === 0 || allProducts.length === 0) return;
    const fetchJoin = async () => {
      const { data } = await supabase.from("product_categories").select("product_id, category_id");
      if (!data) return;
      setAllProducts((prev) =>
        prev.map((p) => ({
          ...p,
          product_categories: data.filter((r) => r.product_id === p.id).map((r) => ({
            category_id: r.category_id,
            categories: categories.find((c) => c.id === r.category_id)!,
          })),
        }))
      );
    };
    fetchJoin();
  }, [selectedCategories.length > 0, categories.length]);

  // Also eagerly load categories join when products load
  useEffect(() => {
    if (allProducts.length === 0 || categories.length === 0) return;
    const hasCatData = allProducts.some((p) => p.product_categories !== undefined);
    if (hasCatData) return;
    const fetchJoin = async () => {
      const { data } = await supabase.from("product_categories").select("product_id, category_id");
      if (!data) return;
      setAllProducts((prev) =>
        prev.map((p) => ({
          ...p,
          product_categories: data.filter((r) => r.product_id === p.id).map((r) => ({
            category_id: r.category_id,
            categories: categories.find((c) => c.id === r.category_id)!,
          })),
        }))
      );
    };
    fetchJoin();
  }, [allProducts.length, categories.length]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setSort("newest");
  };

  const hasActiveFilters = debouncedSearch || selectedCategories.length > 0 || sort !== "newest" || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Categories</p>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={selectedCategories.length === 0}
              onChange={() => setSelectedCategories([])}
              className="w-4 h-4 rounded border-border accent-brand" />
            <span className={cn("text-sm transition-colors", selectedCategories.length === 0 ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
              All
            </span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="w-4 h-4 rounded border-border accent-brand" />
              <span className={cn("text-sm transition-colors", selectedCategories.includes(cat.id) ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Price Range</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{format(priceRange[0])}</span>
            <span className="font-semibold text-brand">{format(priceRange[1])}</span>
          </div>
          {/* Min slider */}
          <div className="relative">
            <input type="range" min={0} max={maxPrice} step={10}
              value={priceRange[0]}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val < priceRange[1]) setPriceRange([val, priceRange[1]]);
              }}
              className="range-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "hsl(var(--brand))" }} />
          </div>
          {/* Max slider */}
          <div className="relative">
            <input type="range" min={0} max={maxPrice} step={10}
              value={priceRange[1]}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > priceRange[0]) setPriceRange([priceRange[0], val]);
              }}
              className="range-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "hsl(var(--brand))" }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Min</p>
              <input type="number" value={priceRange[0]} min={0} max={priceRange[1] - 1}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  if (val < priceRange[1]) setPriceRange([val, priceRange[1]]);
                }}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand/40" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Max</p>
              <input type="number" value={priceRange[1]} min={priceRange[0] + 1} max={maxPrice}
                onChange={(e) => {
                  const val = Math.min(maxPrice, Number(e.target.value));
                  if (val > priceRange[0]) setPriceRange([priceRange[0], val]);
                }}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand/40" />
            </div>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={clearFilters}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/50 transition-all">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-muted-foreground mt-1 text-sm">Explore our full collection</p>
        </div>

        {/* Top bar: search + sort + mobile filter toggle */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Sort"}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", sortOpen && "rotate-180")} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={cn("w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted/60",
                      sort === opt.value ? "font-semibold text-brand bg-brand/5" : "text-foreground")}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
              filtersOpen || hasActiveFilters ? "bg-foreground text-white border-foreground" : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {(selectedCategories.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <span className="bg-brand text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {selectedCategories.length + (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Mobile filter drawer */}
        {filtersOpen && (
          <div className="lg:hidden mb-6 p-5 bg-card rounded-2xl border border-border shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Filters</p>
              <button onClick={() => setFiltersOpen(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <FilterPanel />
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-6 bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="font-semibold text-sm">Filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-brand hover:underline">Clear all</button>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Active filter pills */}
            {(selectedCategories.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategories.map((id) => {
                  const cat = categories.find((c) => c.id === id);
                  return cat ? (
                    <span key={id} className="flex items-center gap-1.5 px-3 py-1 bg-foreground/5 border border-border rounded-full text-xs font-medium">
                      {cat.name}
                      <button onClick={() => toggleCategory(id)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </span>
                  ) : null;
                })}
                {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full text-xs font-medium">
                    {format(priceRange[0])} – {format(priceRange[1])}
                    <button onClick={() => setPriceRange([0, maxPrice])}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[4/5]" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                  {debouncedSearch && <> for <span className="font-medium text-foreground">"{debouncedSearch}"</span></>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            ) : (
              <div className="text-center py-24 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 opacity-30" />
                </div>
                <p className="font-semibold text-base">No products found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 text-sm text-brand hover:underline font-medium">Clear all filters</button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
