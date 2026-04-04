"use client";

import type { CandidateProfile } from "@/lib/types";
import DistrictCombobox from "./DistrictCombobox";

interface Props {
  profile: CandidateProfile;
  onChange: (profile: CandidateProfile) => void;
}

export default function CandidateProfileInput({ profile, onChange }: Props) {
  const update = (field: keyof CandidateProfile, value: string) => {
    onChange({ ...profile, [field]: value });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">候補者プロフィール</div>
      <div className="flex gap-3 mb-3">
        <div className="w-1/3">
          <label className="block text-[11px] text-gray-500 mb-1">候補者名</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="山田 太郎"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
          />
        </div>
        <div className="w-1/4">
          <label className="block text-[11px] text-gray-500 mb-1">所属政党</label>
          <input
            type="text"
            value={profile.party}
            onChange={(e) => update("party", e.target.value)}
            placeholder="無所属"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">選挙区</label>
        <DistrictCombobox
          value={profile.district}
          onChange={(v) => update("district", v)}
          onSubmit={(v) => update("district", v)}
        />
      </div>
      <div className="mt-3">
        <label className="block text-[11px] text-gray-500 mb-1">公約（自由記述）</label>
        <textarea
          value={profile.platform}
          onChange={(e) => update("platform", e.target.value)}
          placeholder="候補者の主な公約や政策方針を記入してください"
          className="w-full min-h-[60px] rounded-md border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}
