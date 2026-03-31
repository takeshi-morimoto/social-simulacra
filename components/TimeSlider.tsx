"use client";

import { TIME_SLOTS, type TimeSlot } from "@/lib/types";

interface Props {
  value: TimeSlot;
  onChange: (slot: TimeSlot) => void;
}

export default function TimeSlider({ value, onChange }: Props) {
  const currentIndex = TIME_SLOTS.findIndex((s) => s.key === value);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-800 mb-3">時間帯</div>
      <input
        type="range"
        min={0}
        max={TIME_SLOTS.length - 1}
        value={currentIndex}
        onChange={(e) => onChange(TIME_SLOTS[parseInt(e.target.value)].key)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B2A4A]"
      />
      <div className="flex justify-between mt-2">
        {TIME_SLOTS.map((slot, i) => (
          <button
            key={slot.key}
            onClick={() => onChange(slot.key)}
            className={`text-[10px] leading-tight text-center px-1 py-0.5 rounded transition-colors ${
              i === currentIndex
                ? "text-white bg-[#1B2A4A] font-bold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {slot.label.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
