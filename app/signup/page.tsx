"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登録に失敗しました");
        setLoading(false);
        return;
      }

      // Auto login after signup
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      router.push("/");
      router.refresh();
    } catch {
      setError("登録に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#1B2A4A]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
          参謀AI
        </h1>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">新規登録</h2>

          {error && (
            <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">お名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山田 太郎"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#1B2A4A] focus:ring-2 focus:ring-[#1B2A4A] placeholder:text-gray-400"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#1B2A4A] focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-gray-500">パスワード（8文字以上）</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#1B2A4A] focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#1B2A4A] py-2.5 text-sm font-semibold text-white hover:bg-[#2a3d6b] disabled:opacity-50 transition-colors"
          >
            {loading ? "登録中..." : "メールで新規登録"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-md border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Googleで登録
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            既にアカウントをお持ちの方は
            <Link href="/login" className="ml-1 text-[#1B2A4A] font-semibold hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
