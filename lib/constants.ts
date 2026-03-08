import type { Persona } from "./types";

export const SAMPLES = [
  "来年4月から住民票・印鑑証明などの窓口申請を廃止し、マイナンバーカードとスマートフォンアプリのみに移行します",
  "区内の公共施設予約をすべてオンライン化し、電話・窓口での予約は廃止します",
  "生活保護の申請手続きをAIチャットボットで完結できるよう変更します",
];

export const PERSONAS: Persona[] = [
  { id: 1, name: "田中 節子", age: 72, role: "年金生活者", icon: "👵", color: "#E8A87C", bg: "#FDF3EA", detail: "豊島区在住30年。デジタル機器が苦手で、役所の窓口に頼ることが多い。" },
  { id: 2, name: "李 ウェイ", age: 34, role: "外国人住民（中国）", icon: "🧑‍💼", color: "#7EC8A8", bg: "#EAF7F1", detail: "池袋在住4年。日本語は中級レベル。IT系企業勤務。" },
  { id: 3, name: "鈴木 健太", age: 42, role: "子育て世代・会社員", icon: "👨‍👩‍👧", color: "#7BA7D4", bg: "#EAF1FA", detail: "妻と子供2人。平日は仕事で忙しく、行政手続きの時間が取れない。" },
  { id: 4, name: "佐藤 美咲", age: 28, role: "フリーランス・デジタルネイティブ", icon: "👩‍💻", color: "#B07ED4", bg: "#F3EAF9", detail: "SNSやアプリを積極活用。行政DXには賛成だが使いやすさにうるさい。" },
  { id: 5, name: "山本 隆", age: 58, role: "中小企業経営者", icon: "🧑‍🔧", color: "#D4A87E", bg: "#FAF1EA", detail: "従業員10名の製造業。行政手続きの煩雑さに毎年悩んでいる。" },
  { id: 6, name: "中村 あおい", age: 19, role: "大学生", icon: "🎓", color: "#E07EA0", bg: "#FAE9F1", detail: "豊島区出身。住民票の手続きなどを初めて自分でやり始めた世代。" },
];
