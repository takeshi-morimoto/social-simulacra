import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "政策市民シミュレーター｜Social Simulacra";
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
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Border frame */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "4px solid #1a1a1a",
            borderRadius: "4px",
            padding: "48px 80px",
            position: "relative",
          }}
        >
          {/* Inner border */}
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              right: "6px",
              bottom: "6px",
              border: "1.5px solid #9ca3af",
              borderRadius: "3px",
            }}
          />

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#111827",
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}
          >
            政策市民シミュレーター
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 24,
              color: "#6b7280",
              letterSpacing: "0.2em",
              marginBottom: 40,
            }}
          >
            SOCIAL SIMULACRA
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            color: "#4b5563",
            marginTop: 40,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.6,
          }}
        >
          AIが生成した市民ペルソナが政策に反応する
        </div>

        {/* Persona icons row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 32,
            fontSize: 40,
          }}
        >
          <span>👵</span>
          <span>🧑‍💼</span>
          <span>👩‍💻</span>
          <span>👨‍👩‍👧</span>
          <span>🎓</span>
          <span>👴</span>
          <span>🧑‍🔧</span>
          <span>👩‍👦</span>
          <span>🤝</span>
        </div>

        {/* Stance badges */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 28,
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>💪</span>
            <span style={{ color: "#1A6B50", fontWeight: 700 }}>強く賛成</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>👍</span>
            <span style={{ color: "#2B8A6E", fontWeight: 700 }}>賛成</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🤔</span>
            <span style={{ color: "#D4850A", fontWeight: 700 }}>条件付き</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>👎</span>
            <span style={{ color: "#C0392B", fontWeight: 700 }}>反対</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🚫</span>
            <span style={{ color: "#8B1A1A", fontWeight: 700 }}>強く反対</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 18,
            color: "#9ca3af",
          }}
        >
          Produced by KOIKOI, Inc.
        </div>
      </div>
    ),
    { ...size }
  );
}
