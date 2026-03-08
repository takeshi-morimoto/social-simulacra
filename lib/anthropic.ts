const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_RETRIES = 3;

export async function callAnthropic<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

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
        messages: [{ role: "user", content: userMessage }],
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
    const text: string = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as T;
  }

  throw new Error("Max retries exceeded");
}
