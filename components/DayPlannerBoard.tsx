"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CampaignDay, CampaignSpot, RouteStop } from "@/lib/types";
import { calculateTotalDistance, calculateTotalTravelTime } from "@/lib/route-optimizer";

const SPOT_ICONS: Record<string, string> = {
  station: "🚉", park: "🌳", shelter: "🏛️", landmark: "📍", shopping: "🛒", public_hall: "🏢",
};
const DEFAULT_DWELL = 30;

function makeDayItemId(dayIdx: number, spotId: string) { return `d${dayIdx}-${spotId}`; }
function makePoolItemId(spotId: string) { return `pool-${spotId}`; }

function parseId(id: string): { type: "day"; dayIdx: number; spotId: string } | { type: "pool"; spotId: string } | null {
  const dayMatch = id.match(/^d(\d+)-(.+)$/);
  if (dayMatch) return { type: "day", dayIdx: parseInt(dayMatch[1]), spotId: dayMatch[2] };
  const poolMatch = id.match(/^pool-(.+)$/);
  if (poolMatch) return { type: "pool", spotId: poolMatch[1] };
  return null;
}

// --- ソート可能アイテム ---
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-none ${isDragging ? "opacity-20 bg-blue-50 border border-dashed border-blue-300 rounded" : ""}`}>
      {isDragging ? <div className="h-8" /> : children}
    </div>
  );
}

// --- ドロップゾーン ---
function DropZone({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className || ""} ${isOver ? "ring-2 ring-blue-300 ring-inset bg-blue-50/30" : ""} transition-all`}>
      {children}
    </div>
  );
}

// --- カードの中身（通常表示＆オーバーレイ共用） ---
function StopCard({ stop, index, optimized, onRemove, isOverlay }: {
  stop: RouteStop; index: number; optimized: boolean; onRemove?: () => void; isOverlay?: boolean;
}) {
  return (
    <div className={`flex items-start gap-1.5 px-2 py-1.5 bg-white ${isOverlay ? "shadow-xl border-2 border-[#1B2A4A] rounded-lg scale-105" : "cursor-grab active:cursor-grabbing hover:bg-gray-50"} transition-colors`}>
      <span className="text-[10px] text-gray-300 mt-1 select-none">⠿</span>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[10px] flex items-center justify-center font-bold">{index + 1}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs">{SPOT_ICONS[stop.spot.type]}</span>
          <span className="text-xs text-gray-800 truncate">{stop.spot.name}</span>
        </div>
        {optimized && stop.startTime && <div className="text-[9px] text-gray-400">{stop.startTime} ・ {stop.duration}分</div>}
      </div>
      {onRemove && !isOverlay && (
        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
          onPointerDown={(e) => e.stopPropagation()}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function PoolCard({ spot, isOverlay }: { spot: CampaignSpot; isOverlay?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isOverlay ? "bg-white shadow-xl border-2 border-[#1B2A4A] rounded-lg scale-105" : "cursor-grab active:cursor-grabbing hover:bg-gray-100"}`}>
      <span className="text-[10px] text-gray-300 select-none">⠿</span>
      <span className="text-xs">{SPOT_ICONS[spot.type]}</span>
      <span className="text-xs text-gray-700 truncate flex-1">{spot.name}</span>
      <span className="text-[9px] text-gray-400 flex-shrink-0">{spot.score}</span>
    </div>
  );
}

// --- 型定義 ---
interface SpotAdviceData { talkPoints: string[]; avoidTopics: string[]; }

interface Props {
  days: CampaignDay[];
  activeDay: number;
  optimized: boolean;
  availableSpots: CampaignSpot[];
  saving: boolean;
  spotAdvice?: Record<string, SpotAdviceData>;
  adviceLoading?: boolean;
  hasAnalysis?: boolean;
  onGenerateAdvice?: () => void;
  onDaysChange: (days: CampaignDay[]) => void;
  onActiveDayChange: (index: number) => void;
  onOptimize: (dayIndex: number) => void;
  onSave: () => void;
}

type DragItem = { type: "stop"; stop: RouteStop; dayIdx: number; index: number }
  | { type: "pool"; spot: CampaignSpot };

export default function DayPlannerBoard({
  days, activeDay, optimized, availableSpots, saving,
  spotAdvice, adviceLoading, hasAnalysis, onGenerateAdvice,
  onDaysChange, onActiveDayChange, onOptimize, onSave,
}: Props) {
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const usedIds = new Set(days.flatMap((d) => d.stops.map((s) => s.spotId)));
  const unusedSpots = availableSpots.filter((s) => !usedIds.has(s.id));

  // 全アイテムを1つのSortableContextで管理（ドラッグ中の移動を可能に）
  const allIds: string[] = [
    ...unusedSpots.map((s) => makePoolItemId(s.id)),
    ...days.flatMap((day, dayIdx) => day.stops.map((s) => makeDayItemId(dayIdx, s.spotId))),
  ];

  // カスタムコリジョン: まずどのカラム(DropZone)にポインタがあるか判定し、
  // そのカラム内のアイテムだけでclosestCenterを実行
  const customCollision: CollisionDetection = useCallback((args) => {
    // DropZone（カラム）に対してpointerWithinで判定
    const dropZoneIds = ["zone-pool", ...days.map((_, i) => `zone-day-${i}`)];
    const zoneContainers = args.droppableContainers.filter((c) => dropZoneIds.includes(String(c.id)));
    const zoneHits = pointerWithin({ ...args, droppableContainers: zoneContainers });

    if (zoneHits.length > 0) {
      const zoneId = String(zoneHits[0].id);
      // そのゾーン内のアイテムだけでclosestCenter
      let itemPrefix: string;
      if (zoneId === "zone-pool") {
        itemPrefix = "pool-";
      } else {
        const dayIdx = zoneId.replace("zone-day-", "");
        itemPrefix = `d${dayIdx}-`;
      }
      const zoneItems = args.droppableContainers.filter((c) => String(c.id).startsWith(itemPrefix));
      if (zoneItems.length > 0) {
        const itemHits = closestCenter({ ...args, droppableContainers: zoneItems });
        if (itemHits.length > 0) return itemHits;
      }
      // ゾーン内にアイテムがない場合、ゾーン自体を返す（空カラムへのドロップ）
      return zoneHits;
    }

    // ゾーンにヒットしない場合はrectIntersectionでフォールバック
    return rectIntersection(args);
  }, [days]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const parsed = parseId(String(e.active.id));
    if (!parsed) return;
    if (parsed.type === "pool") {
      const spot = availableSpots.find((s) => s.id === parsed.spotId);
      if (spot) setDragItem({ type: "pool", spot });
    } else {
      const day = days[parsed.dayIdx];
      const idx = day?.stops.findIndex((s) => s.spotId === parsed.spotId) ?? -1;
      const stop = day?.stops[idx];
      if (stop) setDragItem({ type: "stop", stop, dayIdx: parsed.dayIdx, index: idx });
    }
  }, [days, availableSpots]);

  // overIdからコンテナ（日のインデックスまたは"pool"）を特定
  const getContainer = useCallback((id: string): { type: "pool" } | { type: "day"; dayIdx: number } | null => {
    if (id === "zone-pool" || id.startsWith("pool-")) return { type: "pool" };
    const zoneMatch = id.match(/^zone-day-(\d+)$/);
    if (zoneMatch) return { type: "day", dayIdx: parseInt(zoneMatch[1]) };
    const parsed = parseId(id);
    if (parsed?.type === "day") return { type: "day", dayIdx: parsed.dayIdx };
    if (parsed?.type === "pool") return { type: "pool" };
    return null;
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDragItem(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const from = parseId(String(active.id));
    if (!from) return;

    const toC = getContainer(String(over.id));
    if (!toC) return;

    const to = parseId(String(over.id));

    // === 同じ日の中で並べ替え ===
    if (from.type === "day" && to?.type === "day" && from.dayIdx === to.dayIdx) {
      const day = days[from.dayIdx];
      const oldIdx = day.stops.findIndex((s) => s.spotId === from.spotId);
      const newIdx = day.stops.findIndex((s) => s.spotId === to.spotId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const newStops = arrayMove(day.stops, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
      onDaysChange(days.map((d, i) => i === from.dayIdx ? { ...d, stops: newStops } : d));
      return;
    }

    // === プール → 日 ===
    if (from.type === "pool" && toC.type === "day") {
      const spot = availableSpots.find((s) => s.id === from.spotId);
      if (!spot) return;
      const newStop: RouteStop = { spotId: spot.id, spot, order: 0, startTime: "", duration: DEFAULT_DWELL };
      const overIdx = to?.type === "day" ? days[toC.dayIdx].stops.findIndex((s) => s.spotId === to.spotId) : -1;
      const insertIdx = overIdx >= 0 ? overIdx + 1 : days[toC.dayIdx].stops.length;
      onDaysChange(days.map((d, i) => {
        if (i !== toC.dayIdx) return d;
        const ns = [...d.stops]; ns.splice(insertIdx, 0, newStop);
        return { ...d, stops: ns.map((s, j) => ({ ...s, order: j })) };
      }));
      return;
    }

    // === 日 → 別の日 ===
    if (from.type === "day" && toC.type === "day" && from.dayIdx !== toC.dayIdx) {
      const stop = days[from.dayIdx].stops.find((s) => s.spotId === from.spotId);
      if (!stop) return;
      const overIdx = to?.type === "day" ? days[toC.dayIdx].stops.findIndex((s) => s.spotId === to.spotId) : -1;
      const insertIdx = overIdx >= 0 ? overIdx : days[toC.dayIdx].stops.length;
      onDaysChange(days.map((d, i) => {
        if (i === from.dayIdx) return { ...d, stops: d.stops.filter((s) => s.spotId !== from.spotId).map((s, j) => ({ ...s, order: j })) };
        if (i === toC.dayIdx) {
          const ns = [...d.stops]; ns.splice(insertIdx, 0, stop);
          return { ...d, stops: ns.map((s, j) => ({ ...s, order: j })) };
        }
        return d;
      }));
      return;
    }

    // === 日 → プール ===
    if (from.type === "day" && toC.type === "pool") {
      onDaysChange(days.map((d, i) =>
        i === from.dayIdx ? { ...d, stops: d.stops.filter((s) => s.spotId !== from.spotId).map((s, j) => ({ ...s, order: j })) } : d
      ));
    }
  }, [days, availableSpots, onDaysChange, getContainer]);

  const handleRemove = useCallback((dayIndex: number, spotId: string) => {
    onDaysChange(days.map((d, i) =>
      i === dayIndex ? { ...d, stops: d.stops.filter((s) => s.spotId !== spotId).map((s, j) => ({ ...s, order: j })) } : d
    ));
  }, [days, onDaysChange]);

  return (
    <DndContext sensors={sensors} collisionDetection={customCollision}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>

        {/* ヘッダー */}
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">
            全{days.length}日間の遊説プラン
            <span className="text-xs text-gray-400 font-normal ml-2">合計{days.reduce((sum, d) => sum + d.stops.length, 0)}箇所</span>
          </div>
          <button onClick={onSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#1B2A4A] text-white hover:bg-[#2a3d5c] transition-colors disabled:opacity-50">
            {saving ? "保存中..." : "全日程を保存"}
          </button>
        </div>

        {/* ボード */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {/* 未配置スポット */}
          <div className="flex flex-col bg-gray-50 rounded-lg border border-dashed border-gray-300 flex-1 min-w-[160px]">
            <div className="p-2 border-b border-gray-200">
              <div className="text-[10px] font-semibold text-gray-600">
                未配置 <span className="text-gray-400 font-normal">{unusedSpots.length}</span>
              </div>
            </div>
            <DropZone id="zone-pool" className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-gray-100">
              {unusedSpots.length === 0 && <div className="p-3 text-[10px] text-gray-300 text-center">全て配置済み</div>}
              {unusedSpots.slice(0, 50).map((spot) => (
                <SortableItem key={makePoolItemId(spot.id)} id={makePoolItemId(spot.id)}>
                  <PoolCard spot={spot} />
                </SortableItem>
              ))}
            </DropZone>
          </div>

          {/* 日別カラム */}
          {days.map((day, dayIdx) => {
            const totalDist = calculateTotalDistance(day.stops);
            const totalTravel = calculateTotalTravelTime(day.stops);
            const isActive = dayIdx === activeDay;

            return (
              <div key={day.dayNumber}
                className={`flex flex-col bg-white rounded-lg border-2 shadow-sm flex-1 min-w-[160px] transition-colors ${
                  isActive ? "border-[#1B2A4A] ring-1 ring-[#1B2A4A]/20" : "border-gray-200 hover:border-gray-300"
                }`}>
                <div className="p-2 border-b border-gray-100 cursor-pointer" onClick={() => onActiveDayChange(dayIdx)}>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-[#1B2A4A] text-white text-[9px] font-bold rounded">{day.dayNumber}日目</span>
                    <span className="text-[10px] text-gray-400">{day.stops.length}箇所</span>
                    {day.stops.length >= 2 && <span className="text-[9px] text-gray-400 ml-auto">{totalDist}km・{totalTravel}分</span>}
                  </div>
                </div>

                <DropZone id={`zone-day-${dayIdx}`} className="flex-1 min-h-[60px] overflow-y-auto max-h-[500px] divide-y divide-gray-50">
                  {day.stops.length === 0 && <div className="p-4 text-center text-[10px] text-gray-300">ドロップして追加</div>}
                  {day.stops.map((stop, i) => (
                    <SortableItem key={makeDayItemId(dayIdx, stop.spotId)} id={makeDayItemId(dayIdx, stop.spotId)}>
                      <StopCard stop={stop} index={i} optimized={optimized}
                        onRemove={() => handleRemove(dayIdx, stop.spotId)} />
                    </SortableItem>
                  ))}
                </DropZone>

                {day.stops.length >= 2 && (
                  <div className="p-2 border-t border-gray-100 space-y-1">
                    <button onClick={(e) => { e.stopPropagation(); onOptimize(dayIdx); }}
                      className="w-full py-1.5 text-[10px] font-medium rounded border border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-colors">
                      ルートを最適化
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const s = day.stops;
                      const o = `${s[0].spot.lat},${s[0].spot.lng}`;
                      const d = `${s[s.length-1].spot.lat},${s[s.length-1].spot.lng}`;
                      const w = s.slice(1,-1).map(x=>`${x.spot.lat},${x.spot.lng}`).join("|");
                      let u = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;
                      if(w) u+=`&waypoints=${w}`;
                      window.open(u,"_blank");
                    }} className="w-full py-1.5 text-[10px] font-medium rounded border border-[#27AE60] text-[#27AE60] hover:bg-[#27AE60] hover:text-white transition-colors">
                      Google Maps
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </SortableContext>

      {/* 訴求ポイント生成ボタン */}
      {days.length > 0 && hasAnalysis && (!spotAdvice || Object.keys(spotAdvice).length === 0) && !adviceLoading && (
        <div className="mt-4">
          <button onClick={onGenerateAdvice} disabled={adviceLoading}
            className="w-full py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 shadow-sm">
            💡 訴求ポイントを作成する
          </button>
        </div>
      )}

      {/* アクティブな日の訴求ポイント */}
      {days[activeDay] && days[activeDay].stops.length > 0 && (spotAdvice && Object.keys(spotAdvice).length > 0 || adviceLoading) && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-1.5 py-0.5 bg-[#1B2A4A] text-white text-[9px] font-bold rounded">
              {days[activeDay].dayNumber}日目
            </span>
            <span className="text-sm font-semibold text-gray-800">訴求ポイント</span>
            {adviceLoading && <span className="text-[10px] text-gray-400 animate-pulse">生成中...</span>}
          </div>
          <div className="space-y-3">
            {days[activeDay].stops.map((stop, i) => {
              const advice = spotAdvice?.[stop.spotId];
              return (
                <div key={stop.spotId} className="flex gap-3">
                  <div className="flex-shrink-0 flex items-start gap-2 w-[140px]">
                    <div className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-800 truncate">{SPOT_ICONS[stop.spot.type]} {stop.spot.name}</div>
                      {stop.startTime && <div className="text-[9px] text-gray-400">{stop.startTime}</div>}
                    </div>
                  </div>
                  <div className="flex-1">
                    {!advice && adviceLoading && <div className="text-[10px] text-gray-300 animate-pulse">生成中...</div>}
                    {advice && (
                      <div>
                        {advice.talkPoints.map((point, j) => (
                          <div key={j} className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 mb-1">💡 {point}</div>
                        ))}
                        {advice.avoidTopics.length > 0 && (
                          <div className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">⚠ {advice.avoidTopics.join("、")}</div>
                        )}
                      </div>
                    )}
                    {!advice && !adviceLoading && <div className="text-[10px] text-gray-300">—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ドラッグオーバーレイ（実際のカードを表示） */}
      <DragOverlay dropAnimation={null}>
        {dragItem?.type === "stop" && (
          <StopCard stop={dragItem.stop} index={dragItem.index} optimized={optimized} isOverlay />
        )}
        {dragItem?.type === "pool" && (
          <PoolCard spot={dragItem.spot} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
