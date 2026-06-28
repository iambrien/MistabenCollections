import { Link } from "react-router-dom";
import { ShoppingBag, Tag, ShoppingCart } from "lucide-react";
import { Product } from "@/types";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { useCart } from "@/stores/cartStore";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { format } = useCurrencyFormat();
  const { addItem } = useCart();
  const [firstGalleryImg, setFirstGalleryImg] = useState<string | null>(null);

  // If no main image, try to grab the first gallery image
  useEffect(() => {
    if (product.image_url) return;
    supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", product.id)
      .order("display_order")
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setFirstGalleryImg(data.image_url); });
  }, [product.id, product.image_url]);

  const displayImage = product.image_url || firstGalleryImg;

  const price = product.has_variants
    ? product.variants && product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.price))
      : null
    : product.base_price;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.has_variants) {
      // Navigate to detail page for variant selection
      window.location.href = `/products/${product.id}`;
      return;
    }
    addItem(product, null, 1);
    toast.success(`${product.title} added to cart!`);
  };

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-brand/30 hover:shadow-lg transition-all duration-300 flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          {displayImage ? (
            <img src={displayImage} alt={product.title}
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
          {/* Quick add overlay */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button onClick={handleAddToCart}
              className="w-full py-3 bg-foreground text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {product.has_variants ? "Choose Options" : "Add to Cart"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-brand transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center justify-between mt-auto gap-2">
            {price !== null && price !== undefined ? (
              <p className="text-brand font-bold text-base">
                {product.has_variants ? "From " : ""}{format(price)}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Price varies</p>
            )}
            <button onClick={handleAddToCart}
              className="shrink-0 w-9 h-9 rounded-lg bg-foreground/5 hover:bg-brand hover:text-white flex items-center justify-center transition-all border border-border hover:border-brand"
              title={product.has_variants ? "Choose Options" : "Add to Cart"}>
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
