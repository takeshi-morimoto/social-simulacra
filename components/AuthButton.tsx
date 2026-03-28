"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-[#1B2A4A] px-4 py-1.5 text-xs font-semibold text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-colors"
      >
        ログイン
      </Link>
    );
  }

  return (
    <Link href="/mypage" className="text-xs font-semibold text-[#1B2A4A] hover:underline">
      マイページ
    </Link>
  );
}
