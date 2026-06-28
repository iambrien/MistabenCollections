import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/stores/authStore";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, isAdmin, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/admin");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(0,0%,6%)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Access</h1>
          <p className="text-gray-400 text-sm mt-1">MISTA<span className="text-brand">BEN</span> Collections</p>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-xl bg-brand/10 border border-brand/20">
          <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-brand/80 leading-relaxed">
            This panel is restricted to authorized administrators only. Unauthorized access attempts are logged.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com" autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full brand-gradient text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing In...</> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
