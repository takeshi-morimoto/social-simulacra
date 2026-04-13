const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_RETRIES = 3;

export async function callAnthropic<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
  jsonArrayResponse?: boolean,
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const prefill = jsonArrayResponse ? "[" : "{";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens ?? 300,
        system: systemPrompt,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: prefill },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw new Error(`API Error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const rawText: string = data.content?.[0]?.text || (jsonArrayResponse ? "]" : "}");
    const text = prefill + rawText.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // モデル出力が max_tokens で打ち切られた等で末尾が壊れた場合、
      // 末尾を補修して再パースを試みる
      const repaired = repairJson(text, jsonArrayResponse ?? false);
      if (repaired !== null) {
        try { return JSON.parse(repaired) as T; } catch { /* fall through */ }
      }
      // stop_reason が "max_tokens" だった場合は明示的にメッセージを残す
      const stopReason = data.stop_reason as string | undefined;
      console.error(
        "[callAnthropic] JSON parse failed.",
        "stop_reason:", stopReason,
        "raw length:", rawText.length,
        "tail:", rawText.slice(-200),
        "error:", (e as Error).message,
      );
      throw new Error(`JSON parse failed (stop_reason=${stopReason}): ${(e as Error).message}`);
    }
  }

  throw new Error("Max retries exceeded");
}

/**
 * モデル出力が途中で切れた JSON を簡易的に補修する。
 *  - 末尾の不完全な要素（途中のキー・値）を取り除く
 *  - 開いている括弧/カッコを閉じる
 * 完璧ではないが、ペルソナ反応のような「キー: 値」の連続なら大半救える。
 */
function repairJson(text: string, isArray: boolean): string | null {
  let s = text.trim();
  if (!s) return null;

  // 末尾の "..." (途中の文字列)、"," 、不完全なキー など壊れた断片を遡って削る
  // 一番外側のオブジェクト/配列内で「最後に閉じた要素」までを残す戦略
  const closer = isArray ? "]" : "}";

  // 末尾から最後の "}" を探し（オブジェクト要素単位で切る）、その後ろを切る
  const lastClose = s.lastIndexOf("}");
  if (lastClose === -1) return null;
  s = s.slice(0, lastClose + 1);

  // 末尾の不要なカンマを削る
  s = s.replace(/,\s*$/, "");

  // 開閉カッコをスキャンしてバランスを取る
  let depthBrace = 0, depthBracket = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depthBrace++;
    else if (ch === "}") depthBrace--;
    else if (ch === "[") depthBracket++;
    else if (ch === "]") depthBracket--;
  }
  if (inStr) return null; // 文字列の途中で切れているのは救えない
  while (depthBracket > 0) { s += "]"; depthBracket--; }
  while (depthBrace > 0) { s += "}"; depthBrace--; }

  // 期待する最外殻と一致するかチェック
  if (isArray && !s.endsWith("]")) return null;
  if (!isArray && !s.endsWith("}")) return null;
  return s;
}
