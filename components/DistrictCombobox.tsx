"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import districtMap from "@/lib/district-map.json";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  loading?: boolean;
}

const ALL_DISTRICTS = Object.keys(districtMap as Record<string, unknown>).sort((a, b) => {
  // 都道府県順 → 区番号順
  const prefA = a.replace(/第\d+区$/, "");
  const prefB = b.replace(/第\d+区$/, "");
  if (prefA !== prefB) return prefA.localeCompare(prefB, "ja");
  const numA = parseInt(a.match(/第(\d+)区/)?.[1] || "0");
  const numB = parseInt(b.match(/第(\d+)区/)?.[1] || "0");
  return numA - numB;
});

/**
 * 入力テキストを正規化して照合用に変換
 * "栃木2" → "栃木.*2", "東京10区" → "東京.*10.*区"
 */
function normalizeQuery(input: string): string {
  return input
    .replace(/\s+/g, "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFFF0 + 0x30)) // 全角→半角数字
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角→半角英字
    .replace(/県|都|府|道|第|区/g, ""); // 助詞を除去
}

function matchDistrict(district: string, query: string): boolean {
  if (!query) return true;
  const normalizedDistrict = normalizeQuery(district);
  const normalizedQuery = normalizeQuery(query);

  // クエリの各文字が順番に含まれるか（あいまいマッチ）
  let pos = 0;
  for (const ch of normalizedQuery) {
    const idx = normalizedDistrict.indexOf(ch, pos);
    if (idx === -1) return false;
    pos = idx + 1;
  }
  return true;
}

export default function DistrictCombobox({ value, onChange, onSubmit, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => ALL_DISTRICTS.filter((d) => matchDistrict(d, value)),
    [value],
  );

  // ハイライトが変わったらスクロール追従
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // 外側クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (district: string) => {
    onChange(district);
    setOpen(false);
    setHighlightIndex(-1);
    onSubmit(district);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        select(filtered[highlightIndex]);
      } else if (filtered.length === 1) {
        select(filtered[0]);
      } else if (value.trim()) {
        // 完全一致 or 最初の候補を選択
        const exact = ALL_DISTRICTS.find((d) => d === value.trim());
        if (exact) {
          select(exact);
        } else if (filtered.length > 0) {
          select(filtered[0]);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="選挙区を検索（例: 栃木2、東京10）"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A]"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtered.map((district, i) => (
            <button
              key={district}
              onClick={() => select(district)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlightIndex
                  ? "bg-[#1B2A4A] text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {district}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && value.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-400 text-center">
          該当する選挙区が見つかりません
        </div>
      )}
    </div>
  );
}
