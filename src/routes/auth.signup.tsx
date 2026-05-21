import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, User, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Join Glowy — Create your account" },
      { name: "description", content: "Sign up as a customer or list your beauty center on Glowy." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "center_owner">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You can sign in now.");
    navigate({ to: "/auth/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-2xl text-display">Glowy</span>
        </Link>
        <h1 className="text-display text-3xl">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join the beauty marketplace built for you.</p>

        {/* Role pick */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-2xl border p-4 text-left transition ${role === "customer" ? "border-primary bg-secondary" : "border-border bg-card"}`}
          >
            <User className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-sm">I'm a customer</p>
            <p className="text-xs text-muted-foreground">Book beauty services</p>
          </button>
          <button
            type="button"
            onClick={() => setRole("center_owner")}
            className={`rounded-2xl border p-4 text-left transition ${role === "center_owner" ? "border-primary bg-secondary" : "border-border bg-card"}`}
          >
            <Store className="h-5 w-5 text-primary" />
            <p className="mt-2 font-medium text-sm">I own a center</p>
            <p className="text-xs text-muted-foreground">List my clinic</p>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-primary">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          Already have an account? <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
