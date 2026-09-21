// src/app/login/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", { email, redirect: false });

    setLoading(false);
    if (res?.error) {
      setError("Access denied. This workspace is invite-only — use one of the demo accounts below.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm border-stone-200 shadow-sm">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
          <Sparkles className="w-6 h-6 text-orange-600" />
        </div>
        <CardTitle className="text-xl font-bold text-stone-800">Bookwise</CardTitle>
        <CardDescription>
          Invite-only workspace sign-in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@bookwise.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg p-2 space-y-0.5">
            <p className="font-medium text-stone-600">Demo accounts:</p>
            <p><span className="font-mono">owner@bookwise.demo</span> — full access</p>
            <p><span className="font-mono">manager@bookwise.demo</span> — management</p>
            <p><span className="font-mono">staff@bookwise.demo</span> — operations only</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? "Signing in..." : "Continue with Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}