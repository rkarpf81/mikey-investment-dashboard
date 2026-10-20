const { test, expect } = require("@playwright/test");
const BASE = process.env.DASHBOARD_URL || "http://127.0.0.1:8765/";
const live = process.env.LIVE_DEPLOYMENT === "true";
test("goal banner is ~50% of original and screenshot evidence is captured", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const banner = page.locator(".summary");
  await expect(banner).toContainText("Building toward $185,000");
  await expect(banner).not.toContainText("Based on manually entered holdings");
  await expect(banner).not.toContainText("Long-term goal by age 18");
  await expect(page.locator("#goaltext")).toBeVisible();
  await expect(page.locator("#goalbar")).toBeVisible();
  const current = await banner.evaluate(
    (el) => el.getBoundingClientRect().height,
  );

  await testInfo.attach("current-goal-banner-desktop", {
    body: await banner.screenshot(),
    contentType: "image/png",
  });
  // Reconstruct the original banner from the actual pre-change CSS and text.
  // This provides a measured, independent baseline at the same viewport and font.
  await page.evaluate(() => {
    const el = document.querySelector(".summary");
    const title = el.querySelector("strong");
    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Long-term goal by age 18 • Based on manually entered holdings";
    title.after(subtitle);
    el.style.padding = "22px 25px";
    el.style.margin = "18px 0 20px";
    title.style.fontSize = "20px";
    const bar = document.querySelector("#goalbar");
    bar.style.height = "9px";
    bar.style.marginTop = "15px";
    const chip = document.querySelector(".summary .progress-chip");
    chip.style.padding = "5px 10px";
  });
  const original = await banner.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  await testInfo.attach("original-goal-banner-reconstructed", {
    body: await banner.screenshot(),
    contentType: "image/png",
  });
  expect(original).toBeGreaterThan(current);
  expect(
    current / original,
    "Current height must be 40–60% of original",
  ).toBeLessThanOrEqual(0.6);
  expect(
    current / original,
    "Do not shrink below 40% of original",
  ).toBeGreaterThanOrEqual(0.4);
  await page.reload();
  await expect(banner).toHaveScreenshot("goal-banner-approved.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.02,
  });
});
test("desktop and mobile screenshots, card geometry, and visible borders", async ({
  page,
}, testInfo) => {
  for (const [label, width] of [
    ["desktop", 1360],
    ["mobile", 390],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveScreenshot(
      "dashboard-" + label + "-approved.png",
      { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.02 },
    );
    await testInfo.attach("dashboard-" + label, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    const cards = page.locator(".cards > .card");
    await expect(cards).toHaveCount(5);
    const geometry = await cards.evaluateAll((nodes) =>
      nodes.map((n) => {
        const rect = n.getBoundingClientRect(),
          css = getComputedStyle(n);
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          border: css.borderTopWidth,
          color: css.borderTopColor,
        };
      }),
    );
    for (const card of geometry) {
      expect(card.border).toBe("2px");
      expect(card.color).toBe("rgb(113, 137, 168)");
      expect(card.width).toBeGreaterThan(0);
    }
    if (label === "desktop")
      expect(
        Math.max(...geometry.map((c) => c.y)) -
          Math.min(...geometry.map((c) => c.y)),
      ).toBeLessThan(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 2,
    );
    expect(overflow, "No horizontal viewport overflow").toBe(false);
  }
});
test("published dashboard matches published manifest and Refresh fetches new data", async ({
  page,
}) => {
  test.skip(!live, "Only run against actual GitHub Pages deployment");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const build = await page
    .locator('meta[name="dashboard-build"]')
    .getAttribute("content");
  const manifest = await page.evaluate(async () => {
    const r = await fetch("./version.json?verification=" + Date.now(), {
      cache: "no-store",
    });
    if (!r.ok) throw Error("Published manifest HTTP " + r.status);
    return r.json();
  });
  expect(build).toBe(manifest.build);
  const calls = [];
  page.on("request", (r) => {
    if (/dashboard_check=|\/quotes\.json\?/.test(r.url())) calls.push(r.url());
  });
  await page.locator("#refreshBtn").click();
  await expect
    .poll(() => calls.length, { timeout: 30000 })
    .toBeGreaterThanOrEqual(2);
  await expect(page.locator("#refreshBtn")).toBeEnabled();
  await expect(page.locator("#refreshStatus")).not.toContainText(
    "version check failed",
  );
});
