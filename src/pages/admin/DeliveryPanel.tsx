import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Truck, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DeliveryZone } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara"
].sort();

interface ZoneForm { state: string; city: string; rate: string; }
const EMPTY_FORM: ZoneForm = { state: "", city: "", rate: "" };

export default function DeliveryPanel() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);
  const [searchState, setSearchState] = useState("");

  const fetchZones = async () => {
    const { data } = await supabase.from("delivery_zones").select("*").order("state").order("city");
    setZones(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const groupedZones = zones.reduce<Record<string, DeliveryZone[]>>((acc, z) => {
    if (!acc[z.state]) acc[z.state] = [];
    acc[z.state].push(z);
    return acc;
  }, {});

  const filteredStates = Object.keys(groupedZones).filter(s =>
    !searchState || s.toLowerCase().includes(searchState.toLowerCase())
  ).sort();

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (z: DeliveryZone) => {
    setEditId(z.id);
    setForm({ state: z.state, city: z.city, rate: String(z.rate) });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.state || !form.city || !form.rate) { toast.error("Fill in all fields"); return; }
    const rate = parseFloat(form.rate);
    if (isNaN(rate) || rate < 0) { toast.error("Enter a valid rate"); return; }
    setSaving(true);

    if (editId) {
      const { error } = await supabase.from("delivery_zones").update({ state: form.state, city: form.city, rate }).eq("id", editId);
      if (error) { toast.error("Failed to update zone"); setSaving(false); return; }
      toast.success("Zone updated");
    } else {
      const { error } = await supabase.from("delivery_zones").insert({ state: form.state, city: form.city, rate });
      if (error) { toast.error("Failed to add zone"); setSaving(false); return; }
      toast.success("Zone added");
    }
    setSaving(false);
    closeForm();
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this delivery zone?")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Zone removed");
    setZones(prev => prev.filter(z => z.id !== id));
  };

  const toggleActive = async (z: DeliveryZone) => {
    await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    setZones(prev => prev.map(item => item.id === z.id ? { ...item, is_active: !item.is_active } : item));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Zones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set delivery rates for Nigerian cities. International orders are charged $7.80.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 brand-gradient text-brand-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      {/* International notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Truck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">International Shipping</p>
          <p className="text-xs text-blue-600 mt-0.5">All orders shipped outside Nigeria are automatically charged <strong>$7.80</strong> (converted to the customer's selected currency at checkout).</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editId ? "Edit Zone" : "Add Delivery Zone"}</h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">State *</label>
              <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">City / Town *</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Victoria Island"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Rate (₦) *</label>
              <input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                placeholder="e.g. 1500"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 brand-gradient text-brand-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? "Update" : "Save Zone"}
            </button>
            <button onClick={closeForm} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <input value={searchState} onChange={e => setSearchState(e.target.value)}
        placeholder="Filter by state..."
        className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />

      {/* Zones grouped by state */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      ) : filteredStates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No delivery zones yet</p>
          <p className="text-sm mt-1">Add zones to enable delivery rate selection at checkout</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStates.map(state => (
            <div key={state} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-muted/40 border-b border-border">
                <p className="font-semibold text-sm">{state}</p>
              </div>
              <div className="divide-y divide-border">
                {groupedZones[state].map(zone => (
                  <div key={zone.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", !zone.is_active && "line-through text-muted-foreground")}>{zone.city}</p>
                    </div>
                    <span className="text-sm font-bold text-brand shrink-0">₦{zone.rate.toLocaleString()}</span>
                    <button onClick={() => toggleActive(zone)} title={zone.is_active ? "Disable" : "Enable"}
                      className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs font-bold",
                        zone.is_active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                      {zone.is_active ? "ON" : "OFF"}
                    </button>
                    <button onClick={() => openEdit(zone)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(zone.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
