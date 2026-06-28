import { useEffect, useState } from "react";
import { Users, Mail, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

interface CustomerProfile {
  id: string;
  username: string | null;
  email: string;
}

export default function UsersPanel() {
  const [users, setUsers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("user_profiles").select("*").order("email")
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Registered user accounts</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No registered users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand font-bold text-sm">{(user.username || user.email)[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.username || "—"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
