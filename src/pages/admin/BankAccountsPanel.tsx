import { useState, useEffect } from "react";
import {
  Plus, Edit2, Trash2, X, Loader2, CreditCard,
  Smartphone, Star, CheckCircle, Building2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  account_type: "bank_transfer" | "mobile_money";
  phone_number: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  account_name: "",
  account_number: "",
  bank_name: "",
  account_type: "bank_transfer" as const,
  phone_number: "",
  is_primary: false,
  is_active: true,
  notes: "",
};

const NIGERIAN_BANKS = [
  "Access Bank", "First Bank", "GTBank", "Zenith Bank", "UBA",
  "Opay", "Palmpay", "Kuda Bank", "Moniepoint", "Sterling Bank",
  "FCMB", "Union Bank", "Ecobank", "Fidelity Bank", "Polaris Bank",
  "Wema Bank", "Keystone Bank", "Heritage Bank", "Other",
];

export default function BankAccountsPanel() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) { toast.error("Failed to load accounts"); return; }
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (acc: BankAccount) => {
    setEditing(acc);
    setForm({
      account_name: acc.account_name,
      account_number: acc.account_number,
      bank_name: acc.bank_name,
      account_type: acc.account_type,
      phone_number: acc.phone_number || "",
      is_primary: acc.is_primary,
      is_active: acc.is_active,
      notes: acc.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.account_name.trim()) { toast.error("Account name is required"); return; }
    if (!form.account_number.trim()) { toast.error("Account number is required"); return; }
    if (!form.bank_name.trim()) { toast.error("Bank name is required"); return; }
    setSaving(true);

    const payload = {
      account_name: form.account_name.trim(),
      account_number: form.account_number.trim(),
      bank_name: form.bank_name.trim(),
      account_type: form.account_type,
      phone_number: form.phone_number?.trim() || null,
      is_primary: form.is_primary,
      is_active: form.is_active,
      notes: form.notes?.trim() || null,
    };

    // If setting as primary, unset others first
    if (form.is_primary) {
      await supabase.from("bank_accounts").update({ is_primary: false }).neq("id", editing?.id || "00000000-0000-0000-0000-000000000000");
    }

    if (editing) {
      const { error } = await supabase.from("bank_accounts").update(payload).eq("id", editing.id);
      if (error) { toast.error("Failed to update account"); setSaving(false); return; }
      toast.success("Account updated");
    } else {
      const { error } = await supabase.from("bank_accounts").insert(payload);
      if (error) { toast.error("Failed to add account"); setSaving(false); return; }
      toast.success("Account added");
    }

    setSaving(false);
    setShowModal(false);
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment account?")) return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Account deleted");
    fetchAccounts();
  };

  const setPrimary = async (id: string) => {
    await supabase.from("bank_accounts").update({ is_primary: false }).neq("id", id);
    await supabase.from("bank_accounts").update({ is_primary: true }).eq("id", id);
    toast.success("Primary account updated");
    fetchAccounts();
  };

  const toggleActive = async (acc: BankAccount) => {
    await supabase.from("bank_accounts").update({ is_active: !acc.is_active }).eq("id", acc.id);
    fetchAccounts();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage bank/mobile money accounts shown at checkout</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 brand-gradient text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-16 text-center text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No payment accounts yet</p>
          <p className="text-xs mt-1">Add an account so customers know where to transfer payment</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={cn(
                "bg-card rounded-xl border overflow-hidden transition-all",
                acc.is_primary ? "border-brand ring-1 ring-brand/20" : "border-border",
                !acc.is_active && "opacity-60"
              )}
            >
              <div className="flex items-start gap-4 p-4">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  acc.account_type === "mobile_money" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                )}>
                  {acc.account_type === "mobile_money"
                    ? <Smartphone className="w-5 h-5" />
                    : <Building2 className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{acc.bank_name}</p>
                    {acc.is_primary && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                        <Star className="w-2.5 h-2.5" /> PRIMARY
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      acc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {acc.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                      {acc.account_type.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground font-mono">{acc.account_number}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{acc.account_name}</p>
                    {acc.phone_number && (
                      <p className="text-xs text-muted-foreground">📱 {acc.phone_number}</p>
                    )}
                    {acc.notes && (
                      <p className="text-xs text-muted-foreground italic">{acc.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {!acc.is_primary && (
                    <button
                      onClick={() => setPrimary(acc.id)}
                      title="Set as primary"
                      className="p-1.5 rounded-lg hover:bg-brand/10 text-muted-foreground hover:text-brand transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(acc)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => toggleActive(acc)}
                    title={acc.is_active ? "Deactivate" : "Activate"}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <CheckCircle className={cn("w-4 h-4", acc.is_active ? "text-green-500" : "text-muted-foreground")} />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                  </button>
                </div>
              </div>

              {acc.is_primary && (
                <div className="px-4 py-2 bg-brand/5 border-t border-brand/10 text-xs text-brand font-medium">
                  ⭐ This account is shown first at checkout
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-semibold mb-1">💡 How it works</p>
        <p>Customers see all active accounts at checkout. The <strong>primary account</strong> is shown at the top. If one fails, customers can use alternate accounts. Star (☆) any account to make it primary.</p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold">{editing ? "Edit Account" : "Add Payment Account"}</h2>
              <button onClick={() => !saving && setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["bank_transfer", "mobile_money"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, account_type: t }))}
                      className={cn("py-2.5 rounded-xl border text-sm font-medium transition-all",
                        form.account_type === t ? "bg-foreground text-white border-foreground" : "border-border hover:bg-muted/50")}>
                      {t === "bank_transfer" ? "🏦 Bank Transfer" : "📱 Mobile Money"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Bank / Platform *</label>
                <select
                  value={NIGERIAN_BANKS.includes(form.bank_name) ? form.bank_name : "Other"}
                  onChange={(e) => {
                    if (e.target.value !== "Other") setForm((p) => ({ ...p, bank_name: e.target.value }));
                    else setForm((p) => ({ ...p, bank_name: "" }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Select bank...</option>
                  {NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {(!NIGERIAN_BANKS.includes(form.bank_name) || form.bank_name === "") && (
                  <input
                    value={form.bank_name}
                    onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                    placeholder="Type bank / platform name"
                    className="mt-2 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                )}
              </div>

              {/* Account number */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Account Number *</label>
                <input
                  value={form.account_number}
                  onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                  placeholder="0123456789"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* Account name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Account Name *</label>
                <input
                  value={form.account_name}
                  onChange={(e) => setForm((p) => ({ ...p, account_name: e.target.value }))}
                  placeholder="Mistaben Collections"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* Phone (for mobile money) */}
              {form.account_type === "mobile_money" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Mobile Money Number</label>
                  <input
                    value={form.phone_number}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                    placeholder="+2348012345678"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Use if GTBank fails"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm((p) => ({ ...p, is_primary: e.target.checked }))} className="w-4 h-4 accent-brand" />
                  <span className="text-sm font-medium">Set as Primary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-brand" />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button onClick={() => !saving && setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 brand-gradient text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editing ? "Update" : "Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
