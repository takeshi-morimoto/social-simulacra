"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DemographicProfile, ChartSegment } from "@/lib/types";

interface Props {
  demographics: DemographicProfile;
  municipality: string;
}

const AGE_COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];
const GENDER_COLORS = ["#60A5FA", "#F472B6"];
const INDUSTRY_COLORS = ["#34D399", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA", "#FB923C"];

function MiniPieChart({ data, colors, title }: { data: ChartSegment[]; colors: string[]; title: string }) {
  if (!data?.length) return null;

  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-500 mb-1 text-center">{title}</div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={55}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip
            formatter={(value: any) => [`${value}%`]}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value: string) => <span className="text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DemographicsPanel({ demographics, municipality }: Props) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-gray-800">{municipality} の人口動態・産業構造</div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-[10px] text-gray-400">人口</div>
          <div className="text-sm font-semibold text-gray-800">{demographics.population}</div>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-[10px] text-gray-400">高齢化率</div>
          <div className="text-sm font-semibold text-gray-800">{demographics.aging_rate}</div>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-[10px] text-gray-400">外国人比率</div>
          <div className="text-sm font-semibold text-gray-800">{demographics.foreign_rate}</div>
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-[10px] text-gray-400">世帯の特徴</div>
          <div className="text-sm font-semibold text-gray-800">{demographics.household_features}</div>
        </div>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
        <MiniPieChart data={demographics.age_distribution} colors={AGE_COLORS} title="年齢構成" />
        <MiniPieChart data={demographics.gender_distribution} colors={GENDER_COLORS} title="性別構成" />
        <MiniPieChart data={demographics.industry_distribution} colors={INDUSTRY_COLORS} title="産業構成" />
      </div>

      {/* Industries */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-400 mb-1">主要産業</div>
        <div className="flex flex-wrap gap-1.5">
          {demographics.main_industries.map((ind) => (
            <span key={ind} className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-800">
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        <div className="text-[10px] text-amber-600 font-semibold mb-0.5">ペルソナ配分の根拠</div>
        <div className="text-xs text-amber-900 leading-5">{demographics.rationale}</div>
      </div>
    </div>
  );
}
