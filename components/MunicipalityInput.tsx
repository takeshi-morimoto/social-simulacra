"use client";

import DistrictCombobox from "./DistrictCombobox";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  hasPersonas: boolean;
}

export default function MunicipalityInput({ value, onChange, isGenerating, onGenerate, hasPersonas }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">選挙区を選択</div>
      <div className="flex gap-2">
        <DistrictCombobox
          value={value}
          onChange={onChange}
          onSubmit={onChange}
          loading={isGenerating}
        />
      </div>
      <div className="mt-2 text-xs text-gray-400">
        選挙区名の一部を入力すると候補が表示されます（例: 栃木4、東京10、大阪1）
      </div>
      <button
        onClick={onGenerate}
        disabled={isGenerating || !value.trim()}
        className="mt-4 w-full rounded-md bg-[#1B2A4A] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#2A3D5E] cursor-pointer border-none"
      >
        {isGenerating ? "分析中..." : hasPersonas ? "地域を再分析する" : "地域を分析する"}
      </button>
    </div>
  );
}
