import { useState } from "react";
import { Save, Store, Phone, Mail, FileText, Lock, KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminSettings } from "@/types";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

const DEFAULT_SETTINGS: AdminSettings = {
  adminEmail: "",
  whatsappNumber: "",
  storeName: "Mistaben Collections",
  storeTagline: "Elevate Your Style",
};

async function callUpdateCredentials(type: string, value: string) {
  const { data, error } = await supabase.functions.invoke("update-admin-credentials", {
    body: { type, value },
  });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        const parsed = text ? JSON.parse(text) : null;
        msg = parsed?.error || text || msg;
      } catch {
        // keep original message
      }
    }
    throw new Error(msg);
  }
  return data;
}

export default function Settings() {
  // Store settings
  const [settings, setSettings] = useState<AdminSettings>(() => {
    try {
      const stored = localStorage.getItem("mistaben_settings");
      const adminEmail = localStorage.getItem("mistaben_admin_email") || "";
      return { ...DEFAULT_SETTINGS, ...(stored ? JSON.parse(stored) : {}), adminEmail };
    } catch { return DEFAULT_SETTINGS; }
  });
  const [saving, setSaving] = useState(false);

  // Credential change state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [credLoading, setCredLoading] = useState<"email" | "password" | "phone" | null>(null);
  const [credSuccess, setCredSuccess] = useState<"email" | "password" | "phone" | null>(null);

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

  const handleEmailChange = async () => {
    if (!newEmail.includes("@")) { toast.error("Enter a valid email address"); return; }
    setCredLoading("email");
    setCredSuccess(null);
    try {
      await callUpdateCredentials("email", newEmail);
      toast.success("Email updated — sign in with your new email next time");
      setCredSuccess("email");
      setNewEmail("");
      // Also sign out to force re-login with new credentials
      setTimeout(() => supabase.auth.signOut(), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setCredLoading(null);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setCredLoading("password");
    setCredSuccess(null);
    try {
      await callUpdateCredentials("password", newPassword);
      toast.success("Password updated successfully");
      setCredSuccess("password");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setCredLoading(null);
    }
  };

  const handlePhoneChange = async () => {
    if (!newPhone.trim()) { toast.error("Enter a phone number"); return; }
    setCredLoading("phone");
    setCredSuccess(null);
    try {
      await callUpdateCredentials("phone", newPhone.trim());
      toast.success("Phone number updated");
      setCredSuccess("phone");
      setNewPhone("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update phone");
    } finally {
      setCredLoading(null);
    }
  };

  const storeFields = [
    { key: "storeName" as const, label: "Store Name", icon: Store, placeholder: "Mistaben Collections", type: "text" },
    { key: "storeTagline" as const, label: "Store Tagline", icon: FileText, placeholder: "Elevate Your Style", type: "text" },
    { key: "whatsappNumber" as const, label: "WhatsApp Number", icon: Phone, placeholder: "+2348012345678 (include country code)", type: "tel" },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your store and account settings</p>
      </div>

      {/* ── Store Settings ── */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-brand" /> Store Settings
        </h2>
        <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
          {storeFields.map(({ key, label, icon: Icon, placeholder, type }) => (
            <div key={key} className="px-5 py-4">
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {label}
              </label>
              <input
                type={type}
                value={settings[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
              />
              {key === "whatsappNumber" && (
                <p className="text-xs text-muted-foreground mt-1.5">Orders will send notifications to this number</p>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex items-center gap-2 brand-gradient text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Store Settings"}
        </button>
      </section>

      {/* ── Account Credentials ── */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand" /> Account Credentials
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Changes take effect immediately — no verification required.</p>

        <div className="space-y-4">

          {/* Change Email */}
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Mail className="w-4 h-4 text-muted-foreground" /> Change Login Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
              />
              <button
                onClick={handleEmailChange}
                disabled={credLoading === "email" || !newEmail}
                className="px-4 py-2.5 brand-gradient text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                {credLoading === "email" ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : credSuccess === "email" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : "Update"}
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">⚠ You'll be signed out automatically after changing your email.</p>
          </div>

          {/* Change Password */}
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Lock className="w-4 h-4 text-muted-foreground" /> Change Password
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              <button
                onClick={handlePasswordChange}
                disabled={credLoading === "password" || !newPassword || !confirmPassword}
                className="w-full py-2.5 brand-gradient text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {credLoading === "password" ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating…</>
                ) : credSuccess === "password" ? (
                  <><CheckCircle className="w-4 h-4" /> Password Updated!</>
                ) : "Update Password"}
              </button>
            </div>
          </div>

          {/* Change Phone */}
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
            </label>
            <p className="text-xs text-muted-foreground mb-2">Stored in your account profile for reference.</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+2348012345678"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
              />
              <button
                onClick={handlePhoneChange}
                disabled={credLoading === "phone" || !newPhone}
                className="px-4 py-2.5 brand-gradient text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                {credLoading === "phone" ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : credSuccess === "phone" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : "Save"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
