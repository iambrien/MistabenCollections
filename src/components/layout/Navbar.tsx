import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Search } from "lucide-react";
import { useCart } from "@/stores/cartStore";
import CartDrawer from "@/components/features/CartDrawer";
import CurrencySelector from "@/components/features/CurrencySelector";
import { supabase } from "@/lib/supabase";
import { Product, Category } from "@/types";

interface SearchResult {
  products: Product[];
  categories: Category[];
}

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ products: [], categories: [] });
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
  ];

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults({ products: [], categories: [] }); return; }
    setSearching(true);

    const [{ data: products }, { data: categories }] = await Promise.all([
      // Search by title, description, OR tags
      supabase.from("products")
        .select("id, title, image_url, base_price, has_variants, tags, variants:product_variants(price)")
        .eq("is_active", true)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(6),
      supabase.from("categories")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(4),
    ]);

    // Also search by tags client-side from the returned results + an extra tag query
    const { data: tagProducts } = await supabase
      .from("products")
      .select("id, title, image_url, base_price, has_variants, tags, variants:product_variants(price)")
      .eq("is_active", true)
      .contains("tags", [q.toLowerCase().trim()])
      .limit(4);

    const allProducts = [...(products || []), ...(tagProducts || [])];
    const unique = Array.from(new Map(allProducts.map((p) => [p.id, p])).values()).slice(0, 8);

    setResults({ products: unique, categories: categories || [] });
    setSearching(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(false);
    setQuery("");
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const goTo = (path: string) => {
    setSearchOpen(false);
    setQuery("");
    setResults({ products: [], categories: [] });
    navigate(path);
  };

  const hasResults = results.products.length > 0 || results.categories.length > 0;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white/90 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">
                MISTA<span className="text-brand">BEN</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((l) => (
                <Link key={l.href} to={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <CurrencySelector />

              {/* Search button + dropdown */}
              <div ref={searchRef} className="relative">
                <button onClick={() => setSearchOpen((o) => !o)} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Search">
                  <Search className="w-5 h-5" />
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-fade-in">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-b border-border">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input ref={inputRef} value={query} onChange={handleChange}
                        placeholder="Search products, categories, tags…"
                        className="flex-1 text-sm outline-none bg-transparent placeholder-muted-foreground" />
                      {query && (
                        <button type="button" onClick={() => { setQuery(""); setResults({ products: [], categories: [] }); }}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </form>

                    {searching && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</div>
                    )}

                    {!searching && query && !hasResults && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</div>
                    )}

                    {!searching && hasResults && (
                      <div className="max-h-80 overflow-y-auto">
                        {results.categories.length > 0 && (
                          <div>
                            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</p>
                            {results.categories.map((cat) => (
                              <button key={cat.id} onClick={() => goTo(`/products?category=${encodeURIComponent(cat.name)}`)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left">
                                <span className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                                  {cat.name[0].toUpperCase()}
                                </span>
                                <span className="text-sm font-medium">{cat.name}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {results.products.length > 0 && (
                          <div>
                            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
                            {results.products.map((p) => (
                              <button key={p.id} onClick={() => goTo(`/products/${p.id}`)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                                  {p.image_url
                                    ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-muted-foreground/40" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{p.title}</p>
                                  {p.tags && p.tags.length > 0 && (
                                    <p className="text-xs text-muted-foreground truncate">#{p.tags.slice(0, 3).join(" #")}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        <button onClick={handleSubmit}
                          className="w-full px-4 py-3 text-sm text-brand font-medium hover:bg-brand/5 border-t border-border transition-colors text-center">
                          See all results for "{query}" →
                        </button>
                      </div>
                    )}

                    {!query && (
                      <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                        Type to search products, categories, or tags
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => setIsOpen(true)} className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Cart">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 brand-gradient text-brand-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-white animate-fade-in">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <Link key={l.href} to={l.href} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                  {l.label}
                </Link>
              ))}
              <div className="px-3 py-2">
                <CurrencySelector compact />
              </div>
            </div>
          </div>
        )}
      </nav>
      <CartDrawer />
    </>
  );
}
