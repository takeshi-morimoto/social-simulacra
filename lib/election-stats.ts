/**
 * 選挙の支持率から当選率を推定するユーティリティ。
 *
 * 旧実装は単純なシグモイド関数で、傾きが急な上にサンプル数を考慮していなかった
 * ため、15ペルソナで支持率がそこそこあると一気に99%に張り付いていた。
 *
 * 新実装は以下の不確実性を組み込む：
 *  1. サンプリング誤差（n=15だと標準誤差が10ポイント以上）
 *  2. モデル誤差（LLM生成ペルソナと実有権者のズレ）
 *  3. 上限を90%にキャップ（選挙に絶対はない）
 *
 * "真の支持率が当選ラインを超える確率" を正規分布近似で計算する。
 */

/**
 * 選挙種別ごとの当選ライン（この支持率を超えると当選圏内）
 */
export function getElectionThreshold(municipality?: string): number {
  if (!municipality) return 35; // デフォルト: 衆議院小選挙区

  if (/議会/.test(municipality)) {
    // 市区町村議会: 定数が多く、低い得票率でも当選しやすい
    return 8;
  }
  if (/知事選/.test(municipality)) {
    // 知事選: 事実上2択が多い
    return 40;
  }
  if (/長選/.test(municipality)) {
    // 市区町村長選: 2-3人の争いが多い
    return 35;
  }
  if (/選挙区/.test(municipality) && !/第\d+区/.test(municipality)) {
    // 参議院選挙区
    return 30;
  }
  return 35;
}

/**
 * 標準正規分布の累積分布関数 Φ(z)。
 * Abramowitz & Stegun 7.1.26 近似（誤差 < 1.5e-7）。
 */
function normalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * 当選率を推定する。
 * @param approvalRate 0〜100 の支持率（投票率加重済の値を渡すのが望ましい）
 * @param sampleSize シミュレーションに用いたペルソナ数（不確実性に直結）
 * @param municipality 選挙区名（種別判定用）
 */
export function estimateWinRate(
  approvalRate: number,
  sampleSize: number,
  municipality?: string,
): number {
  const threshold = getElectionThreshold(municipality);

  // 1) サンプリング誤差: 二項分布の標準誤差
  const p = Math.max(0.01, Math.min(0.99, approvalRate / 100));
  const n = Math.max(sampleSize, 1);
  const samplingSE = Math.sqrt((p * (1 - p)) / n) * 100;

  // 2) モデル誤差: LLMペルソナと実有権者のズレ・選挙ダイナミクス
  //    実証的に8〜10ポイント程度の余裕を見ておく
  const modelSE = 9;

  const totalSE = Math.sqrt(samplingSE * samplingSE + modelSE * modelSE);

  // 3) 真の支持率が当選ラインを超える確率
  const z = (approvalRate - threshold) / totalSE;
  const prob = normalCdf(z);

  // 4) 1〜90% にクランプ（100%/0% は現実的でない）
  return Math.round(Math.min(Math.max(prob * 100, 1), 90));
}
