"use client";

import { useState } from "react";
import { SAMPLES } from "@/lib/constants";

interface Props {
  policy: string;
  onPolicyChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

const SEPARATOR = "\n---\n";

export default function PolicyInput({ policy, onPolicyChange, onRun, isRunning }: Props) {
  // 入力欄の数を管理（最低2つ）
  const [slotCount, setSlotCount] = useState(2);

  // policyをパースして配列に（空でも表示用にslotCount分確保）
  const parsed = policy ? policy.split(SEPARATOR) : [];
  const items = Array.from({ length: Math.max(slotCount, parsed.length) }, (_, i) => parsed[i] || "");

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    // 末尾の空文字を除いて保存
    const trimmed = updated.slice(0);
    while (trimmed.length > 1 && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
    onPolicyChange(trimmed.join(SEPARATOR));
  };

  const addSlot = () => {
    setSlotCount(items.length + 1);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setSlotCount(Math.max(2, updated.length));
    onPolicyChange(updated.filter((p) => p.trim()).join(SEPARATOR));
  };

  const filledCount = items.filter((p) => p.trim()).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">公約・政策を入力</div>
        {filledCount > 0 && (
          <span className="text-[10px] text-gray-400">{filledCount}件の政策</span>
        )}
      </div>

      <div className="space-y-3">
        {items.map((p, i) => (
          <div key={i} className="relative group">
            <div className="absolute left-2 top-2 text-[9px] text-gray-400 bg-gray-50 px-1 py-0.5 rounded z-10">
              政策{i + 1}
            </div>
            <textarea
              value={p}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={i === 0 ? "例：子育て世帯への月額1万円の給付金を新設" : "別の政策を入力..."}
              className="w-full min-h-[60px] rounded-md border border-gray-300 bg-white pt-7 px-3 pb-3 text-sm leading-relaxed text-gray-900 outline-none resize-y focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
            />
            {items.length > 2 && (
              <button onClick={() => removeItem(i)} type="button"
                className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={addSlot} type="button"
        className="mt-3 flex items-center gap-1 text-xs text-[#1B2A4A] hover:text-[#2a3d5c] font-medium transition-colors cursor-pointer">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
        </svg>
        政策を追加
      </button>

      <div className="mt-3 mb-2 text-[11px] text-gray-400">サンプル公約：</div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample, i) => (
          <button key={i} type="button"
            onClick={() => {
              const emptyIdx = items.findIndex((p) => !p.trim());
              if (emptyIdx >= 0) {
                updateItem(emptyIdx, sample);
              } else {
                // 末尾の空スロットを除いた政策一覧に追加
                const filled = items.filter((p) => p.trim());
                const next = [...filled, sample];
                setSlotCount(next.length);
                onPolicyChange(next.join(SEPARATOR));
              }
            }}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer">
            例{i + 1}：{sample.slice(0, 12)}…
          </button>
        ))}
      </div>

      <button onClick={onRun} type="button"
        disabled={isRunning || filledCount === 0}
        className="mt-4 w-full rounded-md bg-[#1B2A4A] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#2A3D5E] cursor-pointer border-none">
        {isRunning ? "シミュレーション実行中..." : "シミュレーションを実行"}
      </button>
    </div>
  );
}
