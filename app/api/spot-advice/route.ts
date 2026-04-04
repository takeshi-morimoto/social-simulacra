import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import { getAudienceProfile } from "@/lib/spot-audience";
import type { RouteStop } from "@/lib/types";

interface SpotAdviceRequest {
  policy: string;
  analysisRecommendations: string[];
  analysisRisks: string[];
  stops: RouteStop[];
}

interface SpotAdvice {
  talkPoints: string[];
  avoidTopics: string[];
}

const MAX_SPOTS = 8; // API負荷とトークン制限を考慮

export async function POST(req: NextRequest) {
  const { policy, analysisRecommendations, analysisRisks, stops } = (await req.json()) as SpotAdviceRequest;

  if (!policy || !stops || stops.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // スポット数を制限
  const limitedStops = stops.slice(0, MAX_SPOTS);

  const spotContexts = limitedStops.map((stop, i) => {
    const audience = getAudienceProfile(stop.spot.type, stop.startTime);
    return `${i + 1}. ${stop.spot.name}（${stop.startTime}・${stop.spot.type}）→ ${audience.demographics}`;
  }).join("\n");

  const systemPrompt = `選挙遊説アドバイザー。各スポットの来訪者層に合わせた訴求ポイントを提案。

政策: ${policy.slice(0, 200)}
提言: ${analysisRecommendations.slice(0, 2).join("、")}
リスク: ${analysisRisks.slice(0, 2).join("、")}

スポット:
${spotContexts}

JSON配列で回答。talkPointsは各2個、avoidTopicsは1個、各15字以内:
[{"talkPoints":["ポイント1","ポイント2"],"avoidTopics":["避ける話題"]}]`;

  try {
    const result = await callAnthropic<SpotAdvice[]>(
      systemPrompt,
      `${limitedStops.length}箇所`,
      4096,
      true,
    );

    const adviceMap: Record<string, SpotAdvice> = {};
    limitedStops.forEach((stop, i) => {
      const advice = result[i];
      if (advice) {
        adviceMap[stop.spotId] = {
          talkPoints: advice.talkPoints || [],
          avoidTopics: advice.avoidTopics || [],
        };
      }
    });

    return NextResponse.json({ advice: adviceMap });
  } catch (e) {
    console.error("Spot advice error:", e);
    return NextResponse.json({ error: "Failed to generate advice" }, { status: 500 });
  }
}
