// src/app/not-found.tsx
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">Page not found</h1>
        <p className="text-stone-500 mt-2 text-sm max-w-sm mx-auto">
          The page or booking link you followed does not exist.
          Check the address, or head back to safety.
        </p>
        <div className="flex gap-2 justify-center mt-6">
          <Link href="/" className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600">
            Go home
          </Link>
          <Link href="/book/demo-salon" className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-100">
            View demo booking
          </Link>
        </div>
      </div>
    </div>
  );
}