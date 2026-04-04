"use client";

import { useState } from "react";
import DistrictCombobox from "./DistrictCombobox";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: (forceRefresh?: boolean) => void;
  hasPersonas: boolean;
  usedCache?: boolean;
}

export default function MunicipalityInput({ value, onChange, isGenerating, onGenerate, hasPersonas, usedCache }: Props) {
  const [isValid, setIsValid] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">選挙区を選択</div>
      <div className="flex gap-2">
        <DistrictCombobox
          value={value}
          onChange={onChange}
          onSubmit={onChange}
          onValidChange={setIsValid}
          loading={isGenerating}
        />
      </div>
      {value.trim() && !isValid && (
        <div className="mt-2 text-xs text-red-500">
          候補から選挙区を選択してください
        </div>
      )}
      {!value.trim() && (
        <div className="mt-2 text-xs text-gray-400">
          選挙区名の一部を入力すると候補が表示されます（例: 栃木4、東京10、那覇市長）
        </div>
      )}
      <button
        onClick={() => onGenerate()}
        disabled={isGenerating || !isValid}
        className="mt-4 w-full rounded-md bg-[#1B2A4A] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#2A3D5E] cursor-pointer border-none"
      >
        {isGenerating ? "分析中..." : hasPersonas ? "地域を再分析する" : "地域を分析する"}
      </button>
      {hasPersonas && usedCache && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">保存済みの分析結果を使用中</span>
          <button
            onClick={() => onGenerate(true)}
            disabled={isGenerating}
            className="text-[10px] text-[#1B2A4A] hover:underline font-medium disabled:opacity-50"
          >
            最新データで再分析する
          </button>
        </div>
      )}
    </div>
  );
}
