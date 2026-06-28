import { useEffect, useState, useRef } from "react";
import { Plus, Search, Edit2, Trash2, X, Loader2, Package, Upload, Image as ImageIcon, Tag, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product, ProductVariant, Category, ProductImage } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_PRODUCT = {
  title: "", description: "", base_price: "", has_variants: false,
  is_active: true, categories: [] as string[], tags: [] as string[],
};
const EMPTY_VARIANT = { color: "", size: "", price: "", stock: "0" };
const MAX_TAGS = 15;

async function uploadImageFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Upload File directly — fastest method, no extra conversion
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

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

  // Images
  const [mainImageUrl, setMainImageUrl] = useState<string>("");
  const [mainUploading, setMainUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Tags
  const [tagInput, setTagInput] = useState("");

  const mainFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, variants:product_variants(*), product_categories(category_id), product_images(*)")
      .order("created_at", { ascending: false });
    if (error) console.error("Fetch error:", error);
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    supabase.from("categories").select("*").order("name").then(({ data }) => setCategories(data || []));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PRODUCT);
    setVariants([]);
    setMainImageUrl("");
    setGalleryImages([]);
    setTagInput("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    const cats = p.product_categories?.map((pc) => pc.category_id) || [];
    setForm({
      title: p.title,
      description: p.description || "",
      base_price: p.base_price?.toString() || "",
      has_variants: p.has_variants,
      is_active: p.is_active,
      categories: cats,
      tags: p.tags || [],
    });
    setVariants(p.variants || []);
    setMainImageUrl(p.image_url || "");
    setGalleryImages(p.product_images || []);
    setTagInput("");
    setShowModal(true);
  };

  // Upload main cover image
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainUploading(true);
    try {
      const url = await uploadImageFile(file);
      setMainImageUrl(url);
      toast.success("Cover image uploaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("Main image upload error:", err);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setMainUploading(false);
      if (mainFileRef.current) mainFileRef.current.value = "";
    }
  };

  // Upload gallery images (up to 15 total)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 15 - galleryImages.length;
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Only ${remaining} more gallery images allowed`);
    }

    setGalleryUploading(true);
    const uploaded: ProductImage[] = [];

    for (const file of toUpload) {
      try {
        const url = await uploadImageFile(file);
        uploaded.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          product_id: "",
          image_url: url,
          display_order: galleryImages.length + uploaded.length,
          created_at: "",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Gallery upload error:", err);
        toast.error(`Failed to upload ${file.name}: ${msg}`);
      }
    }

    if (uploaded.length) {
      setGalleryImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
    }

    setGalleryUploading(false);
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  };

  const removeGalleryImage = async (img: ProductImage) => {
    if (img.id.startsWith("temp-")) {
      setGalleryImages((prev) => prev.filter((i) => i.id !== img.id));
      return;
    }
    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) { toast.error("Failed to remove image"); return; }
    setGalleryImages((prev) => prev.filter((i) => i.id !== img.id));
    toast.success("Image removed");
  };

  const removeMainImage = () => {
    setMainImageUrl("");
    if (mainFileRef.current) mainFileRef.current.value = "";
  };

  // Tags
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "");
    if (!tag) return;
    if (form.tags.length >= MAX_TAGS) { toast.error(`Max ${MAX_TAGS} tags`); return; }
    if (form.tags.includes(tag)) { toast.error("Tag already added"); return; }
    setForm((p) => ({ ...p, tags: [...p.tags, tag] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Product title is required"); return; }
    setSaving(true);

    const productData = {
      title: form.title.trim(),
      description: form.description || null,
      base_price: form.base_price ? parseFloat(form.base_price) : null,
      has_variants: form.has_variants,
      is_active: form.is_active,
      image_url: mainImageUrl || null,
      tags: form.tags,
    };

    let productId = editing?.id;

    if (editing) {
      const { error } = await supabase.from("products").update(productData).eq("id", editing.id);
      if (error) { toast.error(`Failed to update: ${error.message}`); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(productData).select().single();
      if (error || !data) { toast.error(`Failed to create: ${error?.message}`); setSaving(false); return; }
      productId = data.id;
    }

    if (productId) {
      // Categories
      await supabase.from("product_categories").delete().eq("product_id", productId);
      if (form.categories.length > 0) {
        await supabase.from("product_categories").insert(
          form.categories.map((cid) => ({ product_id: productId, category_id: cid }))
        );
      }

      // Variants
      if (form.has_variants) {
        if (editing) await supabase.from("product_variants").delete().eq("product_id", productId);
        const validVariants = variants.filter((v) => v.price);
        if (validVariants.length > 0) {
          await supabase.from("product_variants").insert(
            validVariants.map((v) => ({
              product_id: productId,
              color: v.color || null,
              size: v.size || null,
              price: parseFloat(String(v.price)),
              stock: parseInt(String(v.stock || 0)),
            }))
          );
        }
      }

      // Save new gallery images (temp ones that were just uploaded)
      const newImages = galleryImages.filter((img) => img.id.startsWith("temp-"));
      if (newImages.length > 0) {
        const { error: imgError } = await supabase.from("product_images").insert(
          newImages.map((img, idx) => ({
            product_id: productId,
            image_url: img.image_url,
            display_order: galleryImages.filter((i) => !i.id.startsWith("temp-")).length + idx,
          }))
        );
        if (imgError) console.error("Gallery save error:", imgError);
      }
    }

    toast.success(editing ? "Product updated!" : "Product created!");
    setSaving(false);
    setShowModal(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product and all its images?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Product deleted");
    fetchProducts();
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 brand-gradient text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or tags..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      {/* Product List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.has_variants ? (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {p.variants?.length || 0} variants
                      </span>
                    ) : p.base_price ? (
                      <span className="text-xs text-brand font-medium">₦{p.base_price.toLocaleString()}</span>
                    ) : null}
                    {(p.product_images?.length || 0) > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ImageIcon className="w-3 h-3" /> {p.product_images?.length} imgs
                      </span>
                    )}
                    {(p.tags || []).length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Tag className="w-3 h-3" /> {p.tags?.length} tags
                      </span>
                    )}
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", p.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500")}>
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="font-semibold">{editing ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => !saving && setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* ── Cover Image ── */}
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-brand" /> Cover Image
                </label>
                {mainImageUrl ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted border border-border group">
                    <img src={mainImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => mainFileRef.current?.click()}
                        disabled={mainUploading}
                        className="flex items-center gap-1.5 bg-white text-foreground px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={removeMainImage}
                        className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mainFileRef.current?.click()}
                    disabled={mainUploading}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-brand/60 bg-muted/30 hover:bg-brand/5 flex flex-col items-center justify-center gap-3 transition-all group"
                  >
                    {mainUploading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-brand animate-spin" />
                        <span className="text-sm text-muted-foreground">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                          <Upload className="w-6 h-6 text-brand" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Click to upload cover image</p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — shown as main product photo</p>
                        </div>
                      </>
                    )}
                  </button>
                )}
                <input ref={mainFileRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
              </div>

              {/* ── Gallery Images ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> Gallery Images
                  </label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {galleryImages.length} / 15
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group border border-border">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeGalleryImage(img)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}

                  {galleryImages.length < 15 && (
                    <button
                      type="button"
                      onClick={() => galleryFileRef.current?.click()}
                      disabled={galleryUploading}
                      className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-brand/50 hover:bg-brand/5 flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      {galleryUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-brand" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                <p className="text-xs text-muted-foreground">Up to 15 gallery images. Hover an image and click ✕ to remove.</p>
              </div>

              {/* ── Title ── */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Product title"
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* ── Description ── */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the product..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
              </div>

              {/* ── Toggles ── */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_variants}
                    onChange={(e) => setForm((p) => ({ ...p, has_variants: e.target.checked }))}
                    className="w-4 h-4 accent-brand"
                  />
                  <span className="text-sm font-medium">Has Variants</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-brand"
                  />
                  <span className="text-sm font-medium">Active / Visible</span>
                </label>
              </div>

              {/* ── Base Price ── */}
              {!form.has_variants && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Base Price (₦ NGN) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₦</span>
                    <input
                      type="number"
                      value={form.base_price}
                      onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))}
                      placeholder="e.g. 25000"
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Enter in Naira — customers see it converted to their chosen currency.</p>
                </div>
              )}

              {/* ── Categories ── */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            categories: p.categories.includes(cat.id)
                              ? p.categories.filter((c) => c !== cat.id)
                              : [...p.categories, cat.id],
                          }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          form.categories.includes(cat.id)
                            ? "bg-brand text-white border-brand"
                            : "border-border hover:border-brand/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tags ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Search Tags
                  </label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {form.tags.length}/{MAX_TAGS}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="e.g. red dress, casual, summer (Enter to add)"
                    disabled={form.tags.length >= MAX_TAGS}
                    className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={form.tags.length >= MAX_TAGS}
                    className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-foreground"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">Tags help customers find products via search. Press Enter or comma to add.</p>
              </div>

              {/* ── Variants ── */}
              {form.has_variants && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Variants</label>
                    <button
                      type="button"
                      onClick={() => setVariants((v) => [...v, { ...EMPTY_VARIANT }])}
                      className="text-xs text-brand hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Variant
                    </button>
                  </div>
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/40 rounded-xl border border-border/50">
                        {(["color", "size", "price", "stock"] as const).map((field) => (
                          <div key={field}>
                            <label className="text-xs text-muted-foreground mb-1 block capitalize">
                              {field}{field === "price" ? " (₦)" : ""}
                            </label>
                            <input
                              placeholder={field === "price" ? "25000" : field}
                              value={String((v as Record<string, unknown>)[field] ?? "")}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((item, idx) => idx === i ? { ...item, [field]: e.target.value } : item)
                                )
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 bg-white"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                          className="col-span-2 sm:col-span-4 text-xs text-red-500 hover:underline text-right pt-1"
                        >
                          Remove variant
                        </button>
                      </div>
                    ))}
                    {variants.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
                        No variants yet. Click "Add Variant" to create one.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => !saving && setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 brand-gradient text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  editing ? "Update Product" : "Create Product"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
