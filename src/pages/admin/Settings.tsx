import { useState } from "react";
import { Save, Store, Phone, Mail, FileText } from "lucide-react";
import { toast } from "sonner";
import { AdminSettings } from "@/types";

const DEFAULT_SETTINGS: AdminSettings = {
  adminEmail: "",
  whatsappNumber: "",
  storeName: "Mistaben Collections",
  storeTagline: "Elevate Your Style",
};

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    try {
      const stored = localStorage.getItem("mistaben_settings");
      const adminEmail = localStorage.getItem("mistaben_admin_email") || "";
      return { ...DEFAULT_SETTINGS, ...(stored ? JSON.parse(stored) : {}), adminEmail };
    } catch { return DEFAULT_SETTINGS; }
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: keyof AdminSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { adminEmail, ...rest } = settings;
    localStorage.setItem("mistaben_settings", JSON.stringify(rest));
    localStorage.setItem("mistaben_admin_email", adminEmail);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    toast.success("Settings saved");
  };

  const fields = [
    { key: "storeName" as const, label: "Store Name", icon: Store, placeholder: "Mistaben Collections", type: "text" },
    { key: "storeTagline" as const, label: "Store Tagline", icon: FileText, placeholder: "Elevate Your Style", type: "text" },
    { key: "adminEmail" as const, label: "Admin Email", icon: Mail, placeholder: "admin@example.com", type: "email" },
    { key: "whatsappNumber" as const, label: "WhatsApp Number", icon: Phone, placeholder: "+233201234567 (no spaces)", type: "tel" },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your store settings</p>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
        {fields.map(({ key, label, icon: Icon, placeholder, type }) => (
          <div key={key} className="px-5 py-4">
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </label>
            <input type={type} value={settings[key]} onChange={(e) => handleChange(key, e.target.value)} placeholder={placeholder}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all" />
            {key === "adminEmail" && <p className="text-xs text-muted-foreground mt-1.5">Only this email can log in as admin</p>}
            {key === "whatsappNumber" && <p className="text-xs text-muted-foreground mt-1.5">Orders will link to this number (include country code)</p>}
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 brand-gradient text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Settings"}
      </button>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-yellow-800 mb-1">First Time Setup</p>
        <p className="text-xs text-yellow-700">
          Set your Admin Email above to restrict login access. Create an account in Supabase Auth first, then set that email here.
          WhatsApp number is used on order confirmation pages for easy customer communication.
        </p>
      </div>
    </div>
  );
}
