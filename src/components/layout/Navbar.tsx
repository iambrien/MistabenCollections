
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Search } from "lucide-react";
import { useCart } from "@/stores/cartStore";
import CartDrawer from "@/components/features/CartDrawer";
import CurrencySelector from "@/components/features/CurrencySelector";

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
  ];

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
            <div className="flex items-center gap-3">
              <CurrencySelector />
              <button onClick={() => navigate("/products")} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
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
