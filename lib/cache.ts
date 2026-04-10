/**
 * localStorageベースのシンプルなキャッシュ
 * 有効期限付き、キーのプレフィックスで名前空間を分離
 */

const DEFAULT_TTL_DAYS = 7;

export function cacheGet<T>(prefix: string, key: string): T | null {
  try {
    const raw = localStorage.getItem(`${prefix}:${key}`);
    if (!raw) return null;
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(`${prefix}:${key}`);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

/**
 * 指定プレフィックスでキー前方一致するエントリを全削除する。
 * 例: cacheInvalidate("simulation", "豊島区長選:") で
 *     その自治体の全シミュレーションキャッシュを破棄。
 */
export function cacheInvalidate(prefix: string, keyPrefix: string): void {
  const fullPrefix = `${prefix}:${keyPrefix}`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(fullPrefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function cacheSet<T>(prefix: string, key: string, data: T, ttlDays = DEFAULT_TTL_DAYS): void {
  try {
    localStorage.setItem(`${prefix}:${key}`, JSON.stringify({
      data,
      expires: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    }));
  } catch {
    // localStorage full — 古いキャッシュを掃除して再試行
    cleanOldCache(prefix);
    try {
      localStorage.setItem(`${prefix}:${key}`, JSON.stringify({
        data,
        expires: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
      }));
    } catch { /* give up */ }
  }
}

/**
 * 指定プレフィックスの期限切れキャッシュを削除
 */
function cleanOldCache(prefix: string): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix + ":")) continue;
    try {
      const { expires } = JSON.parse(localStorage.getItem(key) || "{}");
      if (!expires || Date.now() > expires) keysToRemove.push(key);
    } catch {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * 政策テキストからキャッシュキーを生成。
 * 長さも seed に含めて全文をハッシュするので、複数政策や長文でも
 * 末尾の変更がキーに反映される（衝突して古いキャッシュが返るのを防ぐ）。
 */
export function policyKey(policy: string): string {
  const s = policy.trim();
  let hash = s.length;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return `${s.length.toString(36)}_${Math.abs(hash).toString(36)}`;
}
