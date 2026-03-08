"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  hasPersonas: boolean;
}

const EXAMPLES = [
  "東京都豊島区",
  "北海道夕張市",
  "愛知県豊田市",
  "沖縄県那覇市",
  "秋田県横手市",
  "埼玉県横瀬町",
  "北海道札幌市豊平区",
  "山形県山形市",
];

export default function MunicipalityInput({ value, onChange, isGenerating, onGenerate, hasPersonas }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">自治体を選択</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：東京都豊島区"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
      />
      <div className="mt-3 mb-2 text-[11px] text-gray-400">選択例：</div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
          >
            {ex}
          </button>
        ))}
      </div>
      <button
        onClick={onGenerate}
        disabled={isGenerating || !value.trim()}
        className="mt-4 w-full rounded-md bg-[#1A73B5] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#155A8A] cursor-pointer border-none"
      >
        {isGenerating ? "ペルソナ生成中..." : hasPersonas ? "ペルソナを再生成" : "この自治体のペルソナを生成"}
      </button>
    </div>
  );
}
