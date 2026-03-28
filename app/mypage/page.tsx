"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CandidateProfileInput from "@/components/CandidateProfileInput";
import type { CandidateProfile } from "@/lib/types";
import Link from "next/link";

const INITIAL: CandidateProfile = { name: "", party: "", district: "", platform: "" };

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile>({ ...INITIAL });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/candidate-profile")
        .then((r) => r.json())
        .then((data) => {
          if (data) setProfile({ name: data.name, party: data.party, district: data.district, platform: data.platform });
        });
    }
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/candidate-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setMessage(res.ok ? "保存しました" : "保存に失敗しました");
    } catch {
      setMessage("保存に失敗しました");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[960px] px-5 py-8">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-[960px] px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1B2A4A]">マイページ</h1>
        <Link href="/" className="text-sm text-[#1B2A4A] hover:underline">
          ← トップへ戻る
        </Link>
      </div>

      <div className="mb-2 flex items-center gap-3">
        {session.user?.image && (
          <img src={session.user.image} alt="" className="h-10 w-10 rounded-full" />
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800">{session.user?.name}</p>
          <p className="text-xs text-gray-500">{session.user?.email}</p>
        </div>
      </div>

      <hr className="my-5 border-gray-200" />

      <CandidateProfileInput profile={profile} onChange={setProfile} />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-[#1B2A4A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a3d6b] disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : "プロフィールを保存"}
        </button>
        {message && (
          <p className={`text-sm ${message === "保存しました" ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>

      <hr className="my-8 border-gray-200" />

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
      >
        ログアウト
      </button>
    </div>
  );
}
