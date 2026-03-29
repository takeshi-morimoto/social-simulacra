"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  hasPersonas: boolean;
}

const EXAMPLES = [
  { label: "衆議院", items: ["東京都第10区", "大阪府第1区", "栃木県第4区", "北海道第2区"] },
  { label: "参議院", items: ["東京都選挙区", "大阪府選挙区", "全国比例区"] },
  { label: "都道府県議会", items: ["東京都議会 豊島区選挙区", "大阪府議会 北区選挙区"] },
  { label: "市区町村議会", items: ["豊島区議会", "横浜市議会 港北区選挙区", "夕張市議会"] },
  { label: "首長選", items: ["東京都知事選", "大阪市長選", "那覇市長選"] },
];

export default function MunicipalityInput({ value, onChange, isGenerating, onGenerate, hasPersonas }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">選挙区を入力</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：東京都第10区、豊島区議会、東京都知事選"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1B2A4A] focus:border-[#1B2A4A] placeholder:text-gray-400"
      />
      <div className="mt-3 mb-2 text-[11px] text-gray-400">入力例：</div>
      <div className="space-y-2">
        {EXAMPLES.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 w-20 shrink-0">{group.label}</span>
            {group.items.map((ex) => (
              <button
                key={ex}
                onClick={() => onChange(ex)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={onGenerate}
        disabled={isGenerating || !value.trim()}
        className="mt-4 w-full rounded-md bg-[#1B2A4A] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#2A3D5E] cursor-pointer border-none"
      >
        {isGenerating ? "ペルソナ生成中..." : hasPersonas ? "有権者ペルソナを再生成" : "有権者ペルソナを生成"}
      </button>
    </div>
  );
}
