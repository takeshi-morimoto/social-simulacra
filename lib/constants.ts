import type { VoterPersona } from "./types";

export const SAMPLES = [
  "子育て世帯への月額1万円の給付金を新設し、18歳まで所得制限なしで支給します",
  "75歳以上の医療費自己負担を全額無料化し、財源は法人住民税の引き上げで賄います",
  "中小企業の設備投資に対して最大500万円の補助金制度を創設します",
  "全小中学校の体育館を防災拠点として耐震改修し、非常用発電機と備蓄倉庫を併設します",
];

export const PERSONAS: VoterPersona[] = [
  { id: 1, name: "田中 節子", age: 72, role: "年金生活者", icon: "👵", color: "#E8A87C", bg: "#FDF3EA", detail: "豊島区在住30年。夫と二人暮らし。デジタル機器が苦手で、役所の窓口に頼ることが多い。", personality: "穏やかだが変化に不安を感じやすい", concern: "年金だけでの生活維持と医療費", gender: "女性", voterTurnoutWeight: 0.72, ageGroup: "65歳以上" },
  { id: 2, name: "李 ウェイ", age: 34, role: "IT企業エンジニア", icon: "🧑‍💼", color: "#7EC8A8", bg: "#EAF7F1", detail: "池袋在住4年。妻と1歳の娘。日本語は中級レベル。永住権を目指している。", personality: "合理的で効率を重視する", concern: "子供の教育環境と在留資格", gender: "男性", voterTurnoutWeight: 0.38, ageGroup: "30〜44歳" },
  { id: 3, name: "鈴木 健太", age: 42, role: "子育て世代・会社員", icon: "👨‍👩‍👧", color: "#7BA7D4", bg: "#EAF1FA", detail: "妻と子供2人（小3・小1）。都内メーカーに勤務。住宅ローン返済中。", personality: "真面目で責任感が強いが余裕がない", concern: "子供の学童保育と住宅ローン", gender: "男性", voterTurnoutWeight: 0.50, ageGroup: "30〜44歳" },
  { id: 4, name: "佐藤 美咲", age: 28, role: "フリーランスデザイナー", icon: "👩‍💻", color: "#B07ED4", bg: "#F3EAF9", detail: "一人暮らし。Web系フリーランス3年目。SNSやアプリを積極活用。", personality: "好奇心旺盛でオープンマインド", concern: "国民健康保険料の負担と確定申告", gender: "女性", voterTurnoutWeight: 0.34, ageGroup: "18〜29歳" },
  { id: 5, name: "山本 隆", age: 58, role: "中小企業経営者", icon: "🧑‍🔧", color: "#D4A87E", bg: "#FAF1EA", detail: "従業員10名の金属加工業を経営。父から引き継いだ町工場。", personality: "実直で保守的、義理人情に厚い", concern: "後継者問題と原材料費の高騰", gender: "男性", voterTurnoutWeight: 0.65, ageGroup: "45〜64歳" },
  { id: 6, name: "中村 あおい", age: 19, role: "大学生", icon: "🎓", color: "#E07EA0", bg: "#FAE9F1", detail: "豊島区出身。実家暮らしの大学2年生。アルバイトは週3回。", personality: "社会問題に関心があるが行動は慎重", concern: "奨学金返済への不安と就職活動", gender: "女性", voterTurnoutWeight: 0.34, ageGroup: "18〜29歳" },
  { id: 7, name: "高橋 誠一", age: 65, role: "元公務員・町内会長", icon: "👴", color: "#8B9DC3", bg: "#EDF1F7", detail: "区役所を定年退職後、町内会長に。妻と二人暮らし。地域活動に熱心。", personality: "面倒見が良く、秩序を重んじる", concern: "町内会の担い手不足と高齢化", gender: "男性", voterTurnoutWeight: 0.72, ageGroup: "65歳以上" },
  { id: 8, name: "パク・ジヨン", age: 27, role: "飲食店アルバイト", icon: "👩", color: "#D4A0C0", bg: "#F9EDF5", detail: "新大久保在住。日本語学校に通いながら就職先を探している。N1取得済み。", personality: "明るく社交的、異文化に柔軟", concern: "就労ビザの取得と生活費のやりくり", gender: "女性", voterTurnoutWeight: 0.34, ageGroup: "18〜29歳" },
  { id: 9, name: "渡辺 真理子", age: 38, role: "シングルマザー・パート", icon: "👩‍👦", color: "#E0A070", bg: "#FBF0E4", detail: "小学3年の息子と二人暮らし。スーパーのパート収入と児童手当で生計。", personality: "粘り強いが行政への不信感がある", concern: "息子の学費と自分の将来の生活", gender: "女性", voterTurnoutWeight: 0.50, ageGroup: "30〜44歳" },
  { id: 10, name: "木村 拓也", age: 45, role: "IT企業管理職", icon: "💼", color: "#5B8FA8", bg: "#E8F2F7", detail: "年収800万。妻は専業主婦、中学生の娘1人。タワーマンション在住。", personality: "論理的でデータ重視、やや上から目線", concern: "教育費の増大と老後の資産形成", gender: "男性", voterTurnoutWeight: 0.65, ageGroup: "45〜64歳" },
  { id: 11, name: "斎藤 ハナ", age: 82, role: "独居高齢者", icon: "👵", color: "#C9A0A0", bg: "#F7EDEC", detail: "夫を5年前に亡くし一人暮らし。足が悪く外出が困難。週1回ヘルパーさんが来る。", personality: "控えめだが芯が強い", concern: "一人での生活維持と孤独死への不安", gender: "女性", voterTurnoutWeight: 0.72, ageGroup: "65歳以上" },
  { id: 12, name: "アハメド・カリム", age: 31, role: "コンビニ経営者", icon: "🧑", color: "#A0C4A0", bg: "#EDF7ED", detail: "コンビニ2店舗を経営。妻と子供3人。母国への仕送りもしている。", personality: "勤勉で家族思い、地域に溶け込みたい", concern: "子供の日本語教育と経営の安定", gender: "男性", voterTurnoutWeight: 0.50, ageGroup: "30〜44歳" },
  { id: 13, name: "松本 翔太", age: 24, role: "非正規雇用・フリーター", icon: "🧑", color: "#C8A8D8", bg: "#F3EEF8", detail: "飲食店のアルバイト掛け持ち。一人暮らし。大学中退後3年経過。", personality: "自己肯定感が低く、政治に無関心", concern: "将来への漠然とした不安と低収入", gender: "男性", voterTurnoutWeight: 0.34, ageGroup: "18〜29歳" },
  { id: 14, name: "吉田 恵子", age: 50, role: "NPO代表・福祉活動家", icon: "🤝", color: "#7EB8A0", bg: "#ECF6F1", detail: "生活困窮者支援のNPOを15年運営。行政との連携経験が豊富。", personality: "情熱的で正義感が強い、やや理想主義", concern: "NPOの資金繰りと支援の質の維持", gender: "女性", voterTurnoutWeight: 0.65, ageGroup: "45〜64歳" },
  { id: 15, name: "藤井 大輝", age: 35, role: "タクシー運転手", icon: "🚕", color: "#D4C87E", bg: "#FAF8EA", detail: "個人タクシー5年目。妻と保育園児1人。夜勤が多く家族との時間が少ない。", personality: "庶民感覚が強く、口は悪いが人情家", concern: "燃料費高騰と生活費のやりくり", gender: "男性", voterTurnoutWeight: 0.50, ageGroup: "30〜44歳" },
];
