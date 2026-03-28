"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Leaflet はSSRに対応していないのでdynamic importする
const MapContent = dynamic(() => import("./MapContent"), { ssr: false });

interface Props {
  municipality: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
}

export default function ElectionMap({ municipality }: Props) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!municipality) {
      setLocation(null);
      return;
    }

    // 選挙区名から地域名を抽出してジオコーディング
    const searchQuery = municipality
      .replace(/第\d+区$/, "")
      .replace(/(議会|知事選|市長選|区長選|町長選|村長選).*$/, "")
      .replace(/選挙区$/, "")
      .trim();

    setLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Japan")}&limit=1`,
      { headers: { "Accept-Language": "ja" } },
    )
      .then((r) => r.json())
      .then((results) => {
        if (results.length > 0) {
          setLocation({
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            displayName: results[0].display_name,
          });
        } else {
          setLocation(null);
        }
      })
      .catch(() => setLocation(null))
      .finally(() => setLoading(false));
  }, [municipality]);

  if (!municipality) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">選挙区マップ</div>
      {loading && <p className="text-xs text-gray-400">地図を読み込み中...</p>}
      {!loading && location && (
        <div className="h-[300px] rounded-md overflow-hidden">
          <MapContent location={location} />
        </div>
      )}
      {!loading && !location && (
        <p className="text-xs text-gray-400">この選挙区の地図データが見つかりませんでした</p>
      )}
    </div>
  );
}
