import { X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/stores/cartStore";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const { format } = useCurrencyFormat();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
      <div className="relative z-10 w-full max-w-md bg-white flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-lg">Your Cart</h2>
            {totalItems > 0 && <span className="bg-brand text-brand-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">{totalItems}</span>}
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add some items to get started</p>
              <Link to="/products" onClick={() => setIsOpen(false)}
                className="mt-4 px-5 py-2 brand-gradient text-brand-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.cartId} className="flex gap-3 p-3 rounded-xl border border-border bg-muted/30">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-muted-foreground/40" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{item.product.title}</p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[item.variant.color, item.variant.size].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-brand font-bold text-sm mt-1">{format(item.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeItem(item.cartId)} className="ml-auto p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-brand">{format(totalPrice)}</span>
            </div>
            <Link to="/checkout" onClick={() => setIsOpen(false)}
              className="block w-full brand-gradient text-brand-foreground text-center py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
              Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
