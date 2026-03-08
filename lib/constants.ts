import type { Persona } from "./types";

export const SAMPLES = [
  "来年4月から住民票・印鑑証明などの窓口申請を廃止し、マイナンバーカードとスマートフォンアプリのみに移行します",
  "区内の公共施設予約をすべてオンライン化し、電話・窓口での予約は廃止します",
  "生活保護の申請手続きをAIチャットボットで完結できるよう変更します",
  "当自治体は日本国から独立し、新しい国家を設立します",
];

export const PERSONAS: Persona[] = [
  { id: 1, name: "田中 節子", age: 72, role: "年金生活者", icon: "👵", color: "#E8A87C", bg: "#FDF3EA", detail: "豊島区在住30年。デジタル機器が苦手で、役所の窓口に頼ることが多い。" },
  { id: 2, name: "李 ウェイ", age: 34, role: "外国人住民（中国）", icon: "🧑‍💼", color: "#7EC8A8", bg: "#EAF7F1", detail: "池袋在住4年。日本語は中級レベル。IT系企業勤務。" },
  { id: 3, name: "鈴木 健太", age: 42, role: "子育て世代・会社員", icon: "👨‍👩‍👧", color: "#7BA7D4", bg: "#EAF1FA", detail: "妻と子供2人。平日は仕事で忙しく、行政手続きの時間が取れない。" },
  { id: 4, name: "佐藤 美咲", age: 28, role: "フリーランス・デジタルネイティブ", icon: "👩‍💻", color: "#B07ED4", bg: "#F3EAF9", detail: "SNSやアプリを積極活用。行政DXには賛成だが使いやすさにうるさい。" },
  { id: 5, name: "山本 隆", age: 58, role: "中小企業経営者", icon: "🧑‍🔧", color: "#D4A87E", bg: "#FAF1EA", detail: "従業員10名の製造業。行政手続きの煩雑さに毎年悩んでいる。" },
  { id: 6, name: "中村 あおい", age: 19, role: "大学生", icon: "🎓", color: "#E07EA0", bg: "#FAE9F1", detail: "豊島区出身。住民票の手続きなどを初めて自分でやり始めた世代。" },
  { id: 7, name: "高橋 誠一", age: 65, role: "元公務員・町内会長", icon: "👴", color: "#8B9DC3", bg: "#EDF1F7", detail: "区役所OB。地域活動に熱心で行政の内情にも詳しい。" },
  { id: 8, name: "パク・ジヨン", age: 27, role: "外国人住民（韓国）", icon: "👩", color: "#D4A0C0", bg: "#F9EDF5", detail: "新大久保在住。飲食店でアルバイトしながら日本語学校に通う。" },
  { id: 9, name: "渡辺 真理子", age: 38, role: "シングルマザー・パート勤務", icon: "👩‍👦", color: "#E0A070", bg: "#FBF0E4", detail: "小学生の子供1人。パート収入と児童手当で生計を立てている。" },
  { id: 10, name: "木村 拓也", age: 45, role: "IT企業管理職", icon: "💼", color: "#5B8FA8", bg: "#E8F2F7", detail: "年収800万。行政のデジタル化には積極的で効率重視。" },
  { id: 11, name: "斎藤 ハナ", age: 82, role: "独居高齢者", icon: "👵", color: "#C9A0A0", bg: "#F7EDEC", detail: "夫を5年前に亡くし一人暮らし。足が悪く外出が困難。" },
  { id: 12, name: "アハメド・カリム", age: 31, role: "外国人住民（バングラデシュ）", icon: "🧑", color: "#A0C4A0", bg: "#EDF7ED", detail: "コンビニ経営。家族4人を養い、母国への仕送りもしている。" },
  { id: 13, name: "松本 翔太", age: 24, role: "非正規雇用・フリーター", icon: "🧑‍🎤", color: "#C8A8D8", bg: "#F3EEF8", detail: "飲食店のアルバイト掛け持ち。将来に不安を感じている。" },
  { id: 14, name: "吉田 恵子", age: 50, role: "NPO代表・福祉活動家", icon: "🤝", color: "#7EB8A0", bg: "#ECF6F1", detail: "生活困窮者支援のNPOを運営。行政との連携経験が豊富。" },
  { id: 15, name: "藤井 大輝", age: 35, role: "タクシー運転手", icon: "🚕", color: "#D4C87E", bg: "#FAF8EA", detail: "個人タクシー。燃料費や生活費の値上がりに敏感。" },
];
