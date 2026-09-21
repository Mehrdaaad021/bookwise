// src/app/login/page.tsx
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { CheckCircle2 } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-4">
      {session?.user ? (
        <div className="text-center max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-stone-800 mb-2">You are signed in!</h1>
          <p className="text-sm text-stone-500 mb-4">{session.user.email}</p>
          <p className="text-xs text-stone-400">
            The workspace dashboard is coming in Phase 7. Authentication is working correctly. ✅
          </p>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}