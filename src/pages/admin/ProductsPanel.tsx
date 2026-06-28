import { useEffect, useState, useRef } from "react";
import { Plus, Search, Edit2, Trash2, X, Loader2, Package, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product, ProductVariant, Category } from "@/types";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY_PRODUCT = { title: "", description: "", base_price: "", has_variants: false, is_active: true, image_url: "", categories: [] as string[] };
const EMPTY_VARIANT = { color: "", size: "", price: "", stock: "0" };

export default function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, variants:product_variants(*), product_categories(category_id)").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    supabase.from("categories").select("*").then(({ data }) => setCategories(data || []));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_PRODUCT); setVariants([]); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    const cats = p.product_categories?.map((pc) => pc.category_id) || [];
    setForm({ title: p.title, description: p.description || "", base_price: p.base_price?.toString() || "", has_variants: p.has_variants, is_active: p.is_active, image_url: p.image_url || "", categories: cats });
    setVariants(p.variants || []);
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const path = `products/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Image upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Product title required"); return; }
    setSaving(true);
    const productData = { title: form.title, description: form.description || null, base_price: form.base_price ? parseFloat(form.base_price) : null, has_variants: form.has_variants, is_active: form.is_active, image_url: form.image_url || null };

    let productId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("products").update(productData).eq("id", editing.id);
      if (error) { toast.error("Failed to update product"); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(productData).select().single();
      if (error || !data) { toast.error("Failed to create product"); setSaving(false); return; }
      productId = data.id;
    }

    if (productId) {
      // Update categories
      await supabase.from("product_categories").delete().eq("product_id", productId);
      if (form.categories.length > 0) {
        await supabase.from("product_categories").insert(form.categories.map((cid) => ({ product_id: productId, category_id: cid })));
      }
      // Update variants
      if (form.has_variants) {
        if (editing) await supabase.from("product_variants").delete().eq("product_id", productId);
        const validVariants = variants.filter((v) => v.price);
        if (validVariants.length > 0) {
          await supabase.from("product_variants").insert(validVariants.map((v) => ({ product_id: productId, color: v.color || null, size: v.size || null, price: parseFloat(String(v.price)), stock: parseInt(String(v.stock || 0)) })));
        }
      }
    }

    toast.success(editing ? "Product updated" : "Product created");
    setSaving(false); setShowModal(false); fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Product deleted");
    fetchProducts();
  };

  const filtered = products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button onClick={openCreate} className="flex items-center gap-2 brand-gradient text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
      </div>

      {/* List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No products found</p></div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/40" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.has_variants ? <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{p.variants?.length || 0} variants</span>
                      : p.base_price ? <span className="text-xs text-brand font-medium">{formatPrice(p.base_price)}</span> : null}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Active" : "Hidden"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white">
              <h2 className="font-semibold">{editing ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Product Image</label>
                <div className="flex gap-3 items-start">
                  {form.image_url && <img src={form.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />}
                  <div className="flex-1 space-y-2">
                    <input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Paste image URL..."
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? "Uploading..." : "Or upload file"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Product title"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Product description..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.has_variants} onChange={(e) => setForm((p) => ({ ...p, has_variants: e.target.checked }))} className="w-4 h-4 accent-brand" />
                  <span className="text-sm font-medium">Has Variants</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-brand" />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
              {!form.has_variants && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Base Price (GHS)</label>
                  <input type="number" value={form.base_price} onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))} placeholder="0.00" min="0" step="0.01"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </div>
              )}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat.id} type="button" onClick={() => setForm((p) => ({ ...p, categories: p.categories.includes(cat.id) ? p.categories.filter((c) => c !== cat.id) : [...p.categories, cat.id] }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.categories.includes(cat.id) ? "bg-brand text-white border-brand" : "border-border hover:border-brand"}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.has_variants && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Variants</label>
                    <button onClick={() => setVariants((v) => [...v, { ...EMPTY_VARIANT }])} className="text-xs text-brand hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                  </div>
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 items-center">
                        {["color", "size", "price", "stock"].map((field) => (
                          <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={String((v as Record<string, unknown>)[field] ?? "")}
                            onChange={(e) => setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: e.target.value } : item))}
                            className="w-full px-2 py-2 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-brand/30" />
                        ))}
                        <button onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))} className="col-span-4 text-xs text-red-500 hover:underline text-left">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 brand-gradient text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
