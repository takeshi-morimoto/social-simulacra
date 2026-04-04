"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ELECTION_TYPES, getDistrictsForType, type ElectionType } from "@/lib/election-districts";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  loading?: boolean;
}

export default function DistrictCombobox({ value, onChange, onSubmit, onValidChange, loading }: Props) {
  const [electionType, setElectionType] = useState<ElectionType>("shugi");
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 外部からvalueが変わったら同期＋バリデーション
  useEffect(() => {
    setQuery(value);
    if (value.trim()) {
      // 全選挙種別で完全一致を探す
      const types: ElectionType[] = ["shugi", "sangi", "chiji", "shicho", "gikai"];
      const found = types.some((t) => getDistrictsForType(t).includes(value.trim()));
      onValidChange?.(found);
      // 一致した選挙種別に切り替え
      if (found) {
        for (const t of types) {
          if (getDistrictsForType(t).includes(value.trim())) {
            setElectionType(t);
            break;
          }
        }
      }
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return getDistrictsForType(electionType, query).slice(0, 100);
  }, [electionType, query]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest(".district-combobox")?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (district: string) => {
    setQuery(district);
    onChange(district);
    setOpen(false);
    setHighlightIndex(-1);
    onValidChange?.(true);
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
      } else if (query.trim() && filtered.length > 0) {
        const exact = filtered.find((d) => d === query.trim());
        select(exact || filtered[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  const typeInfo = ELECTION_TYPES.find((t) => t.key === electionType);

  return (
    <div className="district-combobox flex flex-col sm:flex-row gap-2 flex-1">
      {/* 選挙種別セレクト */}
      <select
        value={electionType}
        onChange={(e) => {
          setElectionType(e.target.value as ElectionType);
          setQuery("");
          onChange("");
          setHighlightIndex(-1);
        }}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] sm:w-[180px] flex-shrink-0"
      >
        {ELECTION_TYPES.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>

      {/* 地域検索 */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
            onValidChange?.(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            electionType === "shugi" ? "例: 栃木4、東京10" :
            electionType === "sangi" ? "例: 東京、大阪" :
            electionType === "chiji" ? "例: 東京、北海道" :
            "例: 夕張、横浜、豊島"
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A]"
        />
        {open && filtered.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            <div className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              {typeInfo?.label} — {filtered.length}件{filtered.length >= 100 ? "（上位100件）" : ""}
            </div>
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
        {open && query.trim() && filtered.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-400 text-center">
            該当する選挙区が見つかりません
          </div>
        )}
      </div>
    </div>
  );
}
