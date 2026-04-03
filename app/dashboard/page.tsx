"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import type { CampaignDay } from "@/lib/types";

interface SavedRoute {
  id: string;
  municipality: string;
  name: string;
  routeData: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLoadingRoutes(true);
      fetch("/api/campaign-routes")
        .then((res) => res.json())
        .then((data) => setRoutes(data.routes ?? []))
        .catch(() => setRoutes([]))
        .finally(() => setLoadingRoutes(false));
    }
  }, [status]);

  function parseRouteData(routeData: string): CampaignDay[] {
    try {
      return JSON.parse(routeData) as CampaignDay[];
    } catch {
      return [];
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#1B2A4A", fontFamily: "'Noto Serif JP', serif" }}
          >
            参謀AI
          </h1>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Feature Cards */}
        <section>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: "#1B2A4A" }}
          >
            機能
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/" className="block">
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: "#1B2A4A" }}
                >
                  政策シミュレーター
                </h3>
                <p className="text-gray-600 text-sm">
                  AIペルソナで公約の反応をテスト
                </p>
              </div>
            </Link>
            <Link href="/?tab=route" className="block">
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: "#1B2A4A" }}
                >
                  遊説コース作成
                </h3>
                <p className="text-gray-600 text-sm">
                  最適な遊説ルートを自動生成
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Saved Routes */}
        {status === "authenticated" && (
          <section>
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: "#1B2A4A" }}
            >
              保存済み遊説コース
            </h2>

            {loadingRoutes && (
              <p className="text-gray-500 text-sm">読み込み中...</p>
            )}

            {!loadingRoutes && routes.length === 0 && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm">
                  保存済みの遊説コースはありません
                </p>
                <Link
                  href="/?tab=route"
                  className="inline-block mt-3 text-sm font-medium hover:underline"
                  style={{ color: "#1B2A4A" }}
                >
                  遊説コースを作成する →
                </Link>
              </div>
            )}

            {!loadingRoutes && routes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {routes.map((route) => {
                  const days = parseRouteData(route.routeData);
                  const totalStops = days.reduce(
                    (sum, day) => sum + day.stops.length,
                    0
                  );
                  return (
                    <div
                      key={route.id}
                      className="bg-white border border-gray-200 shadow-sm rounded-lg p-5"
                    >
                      <h3
                        className="font-bold text-base mb-1"
                        style={{ color: "#1B2A4A" }}
                      >
                        {route.name || route.municipality}
                      </h3>
                      <p className="text-gray-500 text-xs mb-3">
                        {route.municipality}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{days.length}日間</span>
                        <span>{totalStops}スポット</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        {formatDate(route.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Prompt to log in */}
        {status === "unauthenticated" && (
          <section>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center">
              <p className="text-gray-600 text-sm">
                ログインすると遊説コースの保存・閲覧ができます
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
