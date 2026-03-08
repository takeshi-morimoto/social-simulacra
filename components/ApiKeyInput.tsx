"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ApiKeyInput({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-amber-400/25 bg-amber-300/8 p-5 mb-7">
      <span className="text-[13px] font-bold text-amber-400 whitespace-nowrap">
        🔑 Anthropic APIキー
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk-ant-..."
        className="min-w-[200px] flex-1 rounded-[10px] border border-amber-400/30 bg-white/8 px-3.5 py-2.5 font-mono text-[13px] tracking-wider text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-600"
      />
      <p className="w-full text-[11px] text-gray-500">
        APIキーは画面上で処理されるのみで、どこにも送信・保存されません。
        キーは{" "}
        <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400">
          console.anthropic.com
        </a>{" "}
        で取得できます。
      </p>
    </div>
  );
}
