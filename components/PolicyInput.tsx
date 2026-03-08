"use client";

import { SAMPLES } from "@/lib/constants";

interface Props {
  policy: string;
  onPolicyChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export default function PolicyInput({ policy, onPolicyChange, onRun, isRunning }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">政策・施策を入力</div>
      <textarea
        value={policy}
        onChange={(e) => onPolicyChange(e.target.value)}
        placeholder="例：来年4月から住民票の窓口申請を廃止し、マイナンバーカードとスマートフォンアプリのみに移行します"
        className="w-full min-h-[80px] rounded-md border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-900 outline-none resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
      />
      <div className="mt-3 mb-2 text-[11px] text-gray-400">サンプル政策：</div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample, i) => (
          <button
            key={i}
            onClick={() => onPolicyChange(sample)}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer"
          >
            例{i + 1}：{sample.slice(0, 12)}…
          </button>
        ))}
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="mt-4 w-full rounded-md bg-[#1A73B5] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#155A8A] cursor-pointer border-none"
      >
        {isRunning ? "シミュレーション実行中..." : "シミュレーションを実行"}
      </button>
    </div>
  );
}
