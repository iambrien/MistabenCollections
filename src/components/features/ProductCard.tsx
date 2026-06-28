import { Link } from "react-router-dom";
import { ShoppingBag, Tag } from "lucide-react";
import { Product } from "@/types";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { format } = useCurrencyFormat();
  const price = product.has_variants
    ? product.variants && product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.price))
      : null
    : product.base_price;

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-brand/30 hover:shadow-lg transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 opacity-30" />
            </div>
          )}
          {product.has_variants && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 glass text-xs font-medium px-2 py-1 rounded-full text-foreground border border-border">
              <Tag className="w-3 h-3" />
              Variants
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mb-1 group-hover:text-brand transition-colors">
            {product.title}
          </h3>
          {price !== null && price !== undefined ? (
            <p className="text-brand font-bold text-base">
              {product.has_variants ? "From " : ""}{format(price)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Price varies</p>
          )}
        </div>
      </div>
    </Link>
  );
}
