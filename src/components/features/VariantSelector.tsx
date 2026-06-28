import { ProductVariant } from "@/types";
import { cn } from "@/lib/utils";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

export default function VariantSelector({ variants, selected, onSelect }: VariantSelectorProps) {
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

  const selectedColor = selected?.color;
  const selectedSize = selected?.size;

  const handleSelect = (color: string | null | undefined, size: string | null | undefined) => {
    const match = variants.find((v) =>
      (color ? v.color === color : true) && (size ? v.size === size : true)
    );
    if (match) onSelect(match);
  };

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Color {selectedColor && <span className="font-normal text-muted-foreground">— {selectedColor}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button key={color} onClick={() => handleSelect(color, selectedSize)}
                className={cn("px-3 py-1.5 rounded-lg text-sm border font-medium transition-all",
                  selectedColor === color
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border hover:border-brand/50 bg-card")}>
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Size {selectedSize && <span className="font-normal text-muted-foreground">— {selectedSize}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button key={size} onClick={() => handleSelect(selectedColor, size)}
                className={cn("min-w-[3rem] px-3 py-1.5 rounded-lg text-sm border font-medium transition-all",
                  selectedSize === size
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border hover:border-brand/50 bg-card")}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
