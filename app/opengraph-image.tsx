import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI市長｜Social Simulacra";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
          background: "#0f172a",
        }}
      >
        {/* Background gradient circles */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,115,181,0.3) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(43,138,110,0.25) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 100, left: 300, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,133,10,0.15) 0%, transparent 70%)" }} />

        {/* Content */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "50px 70px",
          }}
        >
          {/* Left side */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            {/* Title area */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "0.06em",
                  lineHeight: 1.1,
                }}
              >
                AI市長
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "#64748b",
                  letterSpacing: "0.25em",
                  marginTop: 12,
                }}
              >
                SOCIAL SIMULACRA
              </div>
              <div
                style={{
                  width: 80,
                  height: 4,
                  background: "linear-gradient(90deg, #1A73B5, #2B8A6E)",
                  borderRadius: 2,
                  marginTop: 20,
                }}
              />
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 26,
                color: "#94a3b8",
                lineHeight: 1.7,
                maxWidth: 480,
              }}
            >
              AIが生成した市民ペルソナが
              <br />
              あなたの政策に反応する
            </div>

            {/* Stance bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", maxWidth: 400 }}>
                <div style={{ width: "20%", background: "#1A6B50" }} />
                <div style={{ width: "25%", background: "#2B8A6E" }} />
                <div style={{ width: "15%", background: "#D4850A" }} />
                <div style={{ width: "10%", background: "#9CA3AF" }} />
                <div style={{ width: "20%", background: "#C0392B" }} />
                <div style={{ width: "10%", background: "#8B1A1A" }} />
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 15 }}>
                <span style={{ color: "#1A6B50" }}>💪 強く賛成</span>
                <span style={{ color: "#2B8A6E" }}>👍 賛成</span>
                <span style={{ color: "#D4850A" }}>🤔 条件付き</span>
                <span style={{ color: "#9CA3AF" }}>😐 中立</span>
                <span style={{ color: "#C0392B" }}>👎 反対</span>
                <span style={{ color: "#8B1A1A" }}>🚫 強く反対</span>
              </div>
            </div>
          </div>

          {/* Right side - persona grid */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 12,
              marginLeft: 40,
            }}
          >
            {[
              ["👵", "👴", "🧑‍💼"],
              ["👩‍💻", "👨‍👩‍👧", "🎓"],
              ["🧑‍🔧", "👩‍👦", "💼"],
              ["🤝", "🚕", "👷"],
              ["👩‍🍳", "🧑", "👩"],
            ].map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 12 }}>
                {row.map((icon, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 70,
            right: 70,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, color: "#475569" }}>Produced by KOIKOI, Inc.</span>
          <span style={{ fontSize: 14, color: "#475569" }}>ai-mayor.vercel.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
