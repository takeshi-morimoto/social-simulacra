"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CustomDataInput({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left cursor-pointer bg-transparent border-none p-0"
      >
        <div className="text-sm font-semibold text-gray-800">追加情報（任意）</div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3">
          <div className="text-[11px] text-gray-400 mb-2">
            アンケート結果、対立候補の情報、地域事情など、シミュレーションに反映させたい情報を自由に入力してください
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="例：&#10;・前回選挙では投票率42%、現職が60%の得票率で当選&#10;・対立候補のA氏は医療費無料化を公約に掲げている&#10;・地域では最近、大型商業施設の撤退が話題になっている"
            className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
          />
        </div>
      )}
    </div>
  );
}
