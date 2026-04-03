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
  spotId: string;
  talkPoints: string[];
  avoidTopics: string[];
  openingLine: string;
}

export async function POST(req: NextRequest) {
  const { policy, analysisRecommendations, analysisRisks, stops } = (await req.json()) as SpotAdviceRequest;

  if (!policy || !stops || stops.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 各スポットの推定来訪者プロファイルを構築
  const spotContexts = stops.map((stop, i) => {
    const audience = getAudienceProfile(stop.spot.type, stop.startTime);
    return `${i + 1}. ${stop.spot.name}（${stop.startTime}・${stop.spot.type}）
   来訪者層: ${audience.demographics}
   特徴: ${audience.traits}`;
  }).join("\n\n");

  const systemPrompt = `あなたは選挙遊説の戦略アドバイザーです。候補者の政策と、各遊説スポットの来訪者層を踏まえて、各スポットで話すべき内容を具体的にアドバイスしてください。

候補者の政策: ${policy}

政策シミュレーションからの戦略提言:
${analysisRecommendations.map((r) => `- ${r}`).join("\n")}

注意すべきリスク:
${analysisRisks.map((r) => `- ${r}`).join("\n")}

各スポットの情報:
${spotContexts}

以下のJSON形式で回答してください。各スポットについて、来訪者層に合わせた具体的なアドバイスを生成してください:
[
  {
    "spotId": "スポットID",
    "talkPoints": ["話すべきポイント1（20字以内）", "話すべきポイント2", "話すべきポイント3"],
    "avoidTopics": ["避けるべき話題（20字以内）"],
    "openingLine": "この場所での演説の出だし例（40字以内）"
  }
]`;

  try {
    const result = await callAnthropic<SpotAdvice[]>(
      systemPrompt,
      `${stops.length}箇所のスポット別アドバイスを生成してください`,
      2048,
      true,
    );

    // spotIdを正しくマッピング
    const adviceMap: Record<string, SpotAdvice> = {};
    stops.forEach((stop, i) => {
      const advice = result[i];
      if (advice) {
        adviceMap[stop.spotId] = { ...advice, spotId: stop.spotId };
      }
    });

    return NextResponse.json({ advice: adviceMap });
  } catch (e) {
    console.error("Spot advice error:", e);
    return NextResponse.json({ error: "Failed to generate advice" }, { status: 500 });
  }
}
