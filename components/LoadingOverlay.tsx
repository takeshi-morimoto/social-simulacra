"use client";

import { useState, useEffect } from "react";

interface Props {
  message: string;
  estimateSeconds?: number;
}

export default function LoadingOverlay({ message, estimateSeconds }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [message]);

  const progress = estimateSeconds ? Math.min((elapsed / estimateSeconds) * 100, 95) : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#1A73B5]" />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
      {estimateSeconds && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 mb-2">
            <div
              className="h-full rounded-full bg-[#1A73B5] transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>経過 {elapsed}秒</span>
            <span>目安 約{estimateSeconds}秒</span>
          </div>
        </>
      )}
    </div>
  );
}
