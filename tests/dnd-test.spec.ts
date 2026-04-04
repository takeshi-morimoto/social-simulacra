import { test } from "@playwright/test";

test("D&D動作確認", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("http://localhost:3000");
  await page.waitForTimeout(2000);

  // 1. 選挙区入力
  const input = page.locator("input[placeholder*='栃木']").first();
  await input.fill("栃木4");
  await page.waitForTimeout(500);
  const option = page.locator("button:has-text('栃木県第4区')").first();
  if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
    await option.click();
  }
  await page.waitForTimeout(500);

  // 2. 地域を分析する
  const analyzeBtn = page.locator("button:has-text('地域を分析')").first();
  await analyzeBtn.click();
  // 分析完了まで待つ（キャッシュなら即、APIなら最大60秒）
  await page.locator("text=有権者ペルソナ").first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // 3. 遊説プランセクションを開く
  const routeBtn = page.locator("button:has-text('遊説プラン')").first();
  if (await routeBtn.isVisible()) {
    await routeBtn.click();
    await page.waitForTimeout(1000);
  }

  // スポット取得完了待ち
  await page.locator("text=自動生成").first().waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "tests/screenshots/ready.png", fullPage: true });

  // 4. 自動生成
  const generateBtn = page.locator("button:has-text('自動生成')").first();
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: "tests/screenshots/generated.png", fullPage: true });

  // 5. D&Dテスト
  const gripItems = page.locator("text=⠿");
  const count = await gripItems.count();
  console.log(`Found ${count} grip items`);

  if (count >= 2) {
    // 1日目の最初と2番目のアイテム
    const first = gripItems.nth(0);
    const second = gripItems.nth(1);
    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();

    if (firstBox && secondBox) {
      console.log("First:", JSON.stringify(firstBox));
      console.log("Second:", JSON.stringify(secondBox));

      // ドラッグ
      const startX = firstBox.x + firstBox.width / 2;
      const startY = firstBox.y + firstBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.waitForTimeout(100);

      // 10px以上動かしてactivation
      for (let i = 1; i <= 15; i++) {
        await page.mouse.move(startX, startY + i * 4, { steps: 1 });
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/dragging.png", fullPage: true });

      // DragOverlayチェック
      const overlay = page.locator("[class*='shadow-xl']");
      console.log("Overlay count:", await overlay.count());

      // 2番目の位置にドロップ
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.waitForTimeout(500);

      await page.screenshot({ path: "tests/screenshots/dropped.png", fullPage: true });
    }
  } else {
    console.log("Not enough items for D&D test");
    await page.screenshot({ path: "tests/screenshots/no-items.png", fullPage: true });
  }
});
