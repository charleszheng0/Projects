"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">queued</p>
        <h1 className="text-3xl font-bold text-stone-900">Welcome back.</h1>
        <p className="text-stone-400 text-sm mt-1">Log in to pick up where you left off.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-2xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white rounded-3xl py-4 font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-400 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-green-600 font-semibold">
          Sign up
        </Link>
      </p>
    </div>
  );
}
