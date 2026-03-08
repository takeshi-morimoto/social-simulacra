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
    <div className="rounded-[20px] border border-white/12 bg-white/6 p-7 mb-7 backdrop-blur-[20px]">
      <div className="mb-3 text-sm font-bold text-white">📋 政策・施策を入力</div>
      <textarea
        value={policy}
        onChange={(e) => onPolicyChange(e.target.value)}
        placeholder="例：来年4月から住民票の窓口申請を廃止し、マイナンバーカードとスマートフォンアプリのみに移行します"
        className="w-full min-h-[80px] rounded-xl border border-white/20 bg-white/8 p-3.5 text-sm leading-relaxed text-white outline-none resize-y font-[inherit] placeholder:text-gray-600"
      />
      <div className="mt-3 mb-2 text-[11px] text-gray-500">💡 サンプル政策：</div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample, i) => (
          <button
            key={i}
            onClick={() => onPolicyChange(sample)}
            className="rounded-[20px] border border-white/15 bg-white/8 px-3.5 py-1 text-[11px] text-gray-400 transition-all hover:bg-white/18 font-[inherit] cursor-pointer"
          >
            例{i + 1}：{sample.slice(0, 12)}…
          </button>
        ))}
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="mt-4.5 w-full rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 py-3.5 text-[15px] font-bold tracking-wider text-white transition-all disabled:bg-none disabled:bg-white/10 disabled:text-gray-600 disabled:cursor-not-allowed enabled:hover:opacity-90 enabled:hover:-translate-y-px cursor-pointer font-[inherit] border-none"
      >
        {isRunning ? "⏳ シミュレーション実行中..." : "🚀 市民シミュレーションを実行"}
      </button>
    </div>
  );
}
