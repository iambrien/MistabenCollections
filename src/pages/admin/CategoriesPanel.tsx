import { useEffect, useState } from "react";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Category name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("categories").insert({ name: name.trim() });
    if (error) {
      toast.error(error.message.includes("unique") ? "Category already exists" : "Failed to add category");
    } else {
      toast.success("Category added");
      setName("");
      fetchCategories();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Failed to delete category"); return; }
    toast.success("Category deleted");
    fetchCategories();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage product categories and tags</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 brand-gradient text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>

      {/* List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No categories yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(cat.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
