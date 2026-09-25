import { test, expect, type APIRequestContext } from "@playwright/test";
import sharp from "sharp";
const origin = "http://127.0.0.1:3100";
const password = "Only-for-local-tests-79";
async function login(request: APIRequestContext) {
  const r = await request.post("/api/admin/login", {
    headers: { origin },
    data: { password },
  });
  expect(r.status()).toBe(200);
  return (await r.json()).csrf as string;
}
async function get(request: APIRequestContext) {
  const r = await request.get("/api/admin/content");
  expect(r.ok()).toBeTruthy();
  return r.json();
}
async function post(
  request: APIRequestContext,
  path: string,
  csrf: string,
  data: unknown,
) {
  return request.post(`/api/admin/${path}`, {
    headers: { origin, "x-csrf-token": csrf },
    data,
  });
}
test.describe.configure({ mode: "serial" });
test("unauthorized APIs and cross-origin login are rejected", async ({
  request,
}) => {
  for (const path of ["content", "history", "media", "session"])
    expect((await request.get(`/api/admin/${path}`)).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/login", {
        headers: { origin: "https://untrusted.example" },
        data: { password },
      })
    ).status(),
  ).toBe(403);
  const r = await request.get("/admin");
  expect(r.headers()["x-robots-tag"]).toContain("noindex");
  expect(r.headers()["cache-control"]).toContain("no-store");
  const html = await r.text();
  expect(html).not.toContain("scrypt$");
  expect(html).toContain("Yönetim Paneli");
  expect(html).toContain('id="admin-login-password"');
});
test("featured project images link across their full surface", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator('a.project-panel[href^="/projeler/"]');
  await expect(cards).toHaveCount(3);
  const firstCard = cards.first();
  const href = await firstCard.getAttribute("href");
  expect(href).toBeTruthy();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.click({ position: { x: 48, y: 48 } });
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});
test("public page changes use a short accessible focus transition", async ({
  page,
}) => {
  await page.goto("/");
  const transition = page.locator(".page-transition");
  await expect(transition).toHaveCSS("animation-name", "page-focus-in");
  await page
    .getByRole("navigation", { name: "Ana menü" })
    .getByRole("link", { name: "Hakkımızda", exact: true })
    .click();
  await expect(page).toHaveURL(/\/hakkimizda$/);
  await expect(page.locator(".page-transition")).toHaveCSS(
    "animation-duration",
    "0.26s",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projeler");
  await expect(page.locator(".page-transition")).toHaveCSS(
    "animation-name",
    "none",
  );
});
test("login cookies, CSRF, logout and session revocation", async ({
  request,
}) => {
  const csrf = await login(request);
  const state = await request.storageState();
  const cookie = state.cookies.find((c) => c.name === "alpagu_admin")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  const current = await get(request);
  expect(
    (
      await request.post("/api/admin/content", {
        headers: { origin },
        data: { content: current.content, revision: current.revision },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/admin/logout", {
        headers: { origin: "https://untrusted.example", "x-csrf-token": csrf },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect((await post(request, "logout", csrf, {})).ok()).toBeTruthy();
  expect((await request.get("/api/admin/content")).status()).toBe(401);
});
test("save is visible publicly, stale writes fail, restore works and validation is atomic", async ({
  request,
}) => {
  const csrf = await login(request);
  const before = await get(request);
  const content = structuredClone(before.content);
  content.home.subtitle = "Çocukların yarınları için. Doğrulama";
  let r = await post(request, "content", csrf, {
    content,
    revision: before.revision,
    label: "Kayıt doğrulaması",
  });
  expect(r.status()).toBe(200);
  const saved = await r.json();
  expect(await (await request.get("/")).text()).toContain(
    content.home.subtitle,
  );
  r = await post(request, "content", csrf, {
    content: before.content,
    revision: before.revision,
  });
  expect(r.status()).toBe(409);
  content.organization.iban = "TR00000000000000000000000000";
  r = await post(request, "content", csrf, {
    content,
    revision: saved.revision,
  });
  expect(r.status()).toBe(400);
  expect((await get(request)).revision).toBe(saved.revision);
  const writes = await Promise.all(
    [0, 1].map(() =>
      post(request, "content", csrf, {
        content: { ...content, organization: before.content.organization },
        revision: saved.revision,
      }),
    ),
  );
  expect(writes.map((r) => r.status()).sort()).toEqual([200, 409]);
  const latest = await writes.find((r) => r.status() === 200)!.json();
  r = await post(request, "restore", csrf, {
    revision: latest.revision,
    targetRevision: before.revision,
  });
  expect(r.status()).toBe(200);
  expect(await (await request.get("/")).text()).not.toContain("Doğrulama");
});
test("new Turkish project slug works without deployment and unpublishing removes it", async ({
  request,
}) => {
  const csrf = await login(request);
  let current = await get(request);
  const p = {
    ...structuredClone(current.content.projects[0]),
    id: "e2e-project",
    slug: "cocuklar-icin-yeni-kutuphane",
    title: "Çocuklar İçin Yeni Kütüphane",
    featured: false,
    published: true,
  };
  current.content.projects.push(p);
  let r = await post(request, "content", csrf, {
    content: current.content,
    revision: current.revision,
  });
  expect(r.status()).toBe(200);
  expect((await request.get("/projeler/" + p.slug)).status()).toBe(200);
  expect(await (await request.get("/projeler")).text()).toContain(p.title);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(p.slug);
  current = await get(request);
  current.content.projects.find(
    (x: { id: string }) => x.id === p.id,
  ).published = false;
  r = await post(request, "content", csrf, {
    content: current.content,
    revision: current.revision,
  });
  expect(r.status()).toBe(200);
  expect((await request.get("/projeler/" + p.slug)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    p.slug,
  );
});
test("photo upload converts to WebP, stays private until save, then survives restoration", async ({
  request,
}) => {
  const csrf = await login(request);
  const before = await get(request);
  const bytes = await sharp({
    create: { width: 500, height: 300, channels: 3, background: "#157a70" },
  })
    .jpeg()
    .toBuffer();
  const upload = await request.post("/api/admin/media", {
    headers: {
      origin,
      "x-csrf-token": csrf,
      "x-filename": "verification.jpg",
      "Content-Type": "image/jpeg",
    },
    data: bytes,
  });
  expect(upload.status()).toBe(200);
  const asset = await upload.json();
  expect(asset.width).toBe(500);
  expect(asset.bytes).toBeLessThan(bytes.length);
  expect((await request.get(asset.url)).status()).toBe(404);
  expect(
    (await request.get("/api/admin/media/" + asset.id)).headers()[
      "content-type"
    ],
  ).toBe("image/webp");
  const data = structuredClone(before.content);
  data.home.image = asset.url;
  data.home.seo.image = asset.url;
  const saved = await post(request, "content", csrf, {
    content: data,
    revision: before.revision,
  });
  expect(saved.status()).toBe(200);
  expect((await request.get(asset.url)).status()).toBe(200);
  const current = await saved.json();
  expect(
    (
      await post(request, "restore", csrf, {
        revision: current.revision,
        targetRevision: before.revision,
      })
    ).status(),
  ).toBe(200);
  expect((await request.get(asset.url)).status()).toBe(200);
  const bad = await request.post("/api/admin/media", {
    headers: {
      origin,
      "x-csrf-token": csrf,
      "x-filename": "bad.svg",
      "Content-Type": "image/png",
    },
    data: Buffer.from('<svg onload="alert(1)"></svg>'),
  });
  expect(bad.status()).toBe(400);
});
test("desktop editor saves Turkish copy and opens photo library", async ({
  page,
}) => {
  const errors: string[] = [];
  const contentRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/admin/content")
      contentRequests.push(request.method());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Yönetim Paneli" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Yönetim şifresi").fill(password);
  await page
    .getByRole("button", { name: "Şifreyi göster", exact: true })
    .click();
  await expect(page.getByLabel("Yönetim şifresi")).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Şifreyi gizle", exact: true })
    .click();
  await expect(page.getByLabel("Yönetim şifresi")).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Genel bakış", exact: true }),
  ).toBeVisible();
  expect(contentRequests).toEqual([]);
  await page.screenshot({
    path: "test-results/admin-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ana sayfa", exact: true }).click();
  const subtitle = page.getByLabel("Alt metin", { exact: true });
  const original = await subtitle.inputValue();
  await subtitle.fill(original + " İyilikle.");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("yayımlandı");
  await subtitle.fill(original);
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("yayımlandı");
  await page.getByRole("button", { name: "Görseli değiştir" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Görsel kitaplığını kapat" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile panel and public site fit viewport; FAQ opens exclusively", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Yönetim Paneli" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Yönetim şifresi").fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Genel bakış", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/admin-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Yönetim menüsünü aç" }).click();
  await page
    .getByRole("button", { name: "Site bilgileri", exact: true })
    .click();
  await expect(page.getByLabel("IBAN", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("UMUT");
  const details = page.locator('details[name="alpagu-faq"]');
  await details.nth(0).locator("summary").click();
  await details.nth(1).locator("summary").click();
  await expect(details.nth(0)).not.toHaveAttribute("open", "");
  await expect(details.nth(1)).toHaveAttribute("open", "");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".news-card")
      .first()
      .evaluate((el) => getComputedStyle(el).position),
  ).toBe("sticky");
  await page.screenshot({
    path: "test-results/site-mobile.png",
    fullPage: true,
  });
});

test("password changes require current credentials, rotate sessions and persist independently of content", async ({
  request,
  playwright,
}) => {
  const nextPassword = "Yeni-Şifre-test-84";
  const payload = {
    currentPassword: password,
    newPassword: nextPassword,
    confirmPassword: nextPassword,
  };
  expect((await post(request, "password", "", payload)).status()).toBe(401);
  const csrf = await login(request);
  const oldState = await request.storageState();
  const before = await get(request);
  const oldSession = await playwright.request.newContext({
    baseURL: origin,
    storageState: oldState,
  });
  const other = await playwright.request.newContext({ baseURL: origin });
  await login(other);
  try {
    expect(
      (
        await request.post("/api/admin/password", {
          headers: { origin },
          data: payload,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/admin/password", {
          headers: {
            origin: "https://untrusted.example",
            "x-csrf-token": csrf,
          },
          data: payload,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await post(request, "password", csrf, {
          ...payload,
          newPassword: "short",
          confirmPassword: "short",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await post(request, "password", csrf, {
          ...payload,
          confirmPassword: "not-matching",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await post(request, "password", csrf, {
          ...payload,
          currentPassword: "incorrect",
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await post(request, "password", csrf, {
          ...payload,
          newPassword: password,
          confirmPassword: password,
        })
      ).status(),
    ).toBe(400);
    const changed = await post(request, "password", csrf, payload);
    expect(changed.status()).toBe(200);
    const result = await changed.json();
    expect(result.csrf).not.toBe(csrf);
    expect(Object.keys(result)).toEqual(["csrf"]);
    expect(
      (await request.storageState()).cookies.find(
        (c) => c.name === "alpagu_admin",
      )?.value,
    ).not.toBe(oldState.cookies.find((c) => c.name === "alpagu_admin")?.value);
    expect((await oldSession.get("/api/admin/content")).status()).toBe(401);
    expect((await other.get("/api/admin/content")).status()).toBe(401);
    const after = await get(request);
    expect(after.revision).toBe(before.revision);
    expect(after.history).toEqual(before.history);
    expect(JSON.stringify(after)).not.toContain(nextPassword);
    expect(JSON.stringify(after)).not.toContain("argon2id");
    expect(
      (
        await other.post("/api/admin/login", {
          headers: { origin },
          data: { password },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await other.post("/api/admin/login", {
          headers: { origin },
          data: { password: nextPassword },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await post(request, "password", csrf, {
          currentPassword: nextPassword,
          newPassword: password,
          confirmPassword: password,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await post(request, "password", result.csrf, {
          currentPassword: nextPassword,
          newPassword: password,
          confirmPassword: password,
        })
      ).status(),
    ).toBe(200);
    await login(request);
  } finally {
    await oldSession.dispose();
    await other.dispose();
  }
});

test("simultaneous password changes have one winner", async ({
  playwright,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() => playwright.request.newContext({ baseURL: origin })),
  );
  try {
    const csrf = await Promise.all(contexts.map(login));
    const candidates = ["Concurrent-password-A-81", "Concurrent-password-B-82"];
    const results = await Promise.all(
      contexts.map((ctx, i) =>
        post(ctx, "password", csrf[i], {
          currentPassword: password,
          newPassword: candidates[i],
          confirmPassword: candidates[i],
        }),
      ),
    );
    const winner = results.findIndex((r) => r.status() === 200);
    expect(results.filter((r) => r.status() === 200)).toHaveLength(1);
    expect([401, 409]).toContain(results[1 - winner].status());
    expect(
      (await contexts[1 - winner].get("/api/admin/session")).status(),
    ).toBe(401);
    const updated = await results[winner].json();
    expect(
      (
        await post(contexts[winner], "password", updated.csrf, {
          currentPassword: candidates[winner],
          newPassword: password,
          confirmPassword: password,
        })
      ).status(),
    ).toBe(200);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
});

test("password form works on desktop and mobile without decorative labels", async ({
  page,
}) => {
  const nextPassword = "Mobile-form-test-Şifre-87";
  await page.goto("/admin");
  await page.getByLabel("Yönetim şifresi").fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await page
    .getByRole("button", { name: "Şifre değiştir", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Şifre değiştir", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".adm-kicker, .adm-nav-label")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Kaydet", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/password-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Mevcut şifre", { exact: true }).fill(password);
  await page.getByLabel("Yeni şifre", { exact: true }).fill(nextPassword);
  await page
    .getByLabel("Yeni şifre (tekrar)", { exact: true })
    .fill("mismatch-87");
  await page
    .getByRole("button", { name: "Şifreyi değiştir", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "eşleşmiyor",
  );
  await page
    .getByLabel("Yeni şifre (tekrar)", { exact: true })
    .fill(nextPassword);
  await page
    .getByRole("button", { name: "Şifreyi değiştir", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Şifreniz değiştirildi");
  await expect(page.getByLabel("Mevcut şifre", { exact: true })).toHaveValue(
    "",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Genel bakış", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Yönetim menüsünü aç" }).click();
  await page
    .getByRole("button", { name: "Şifre değiştir", exact: true })
    .click();
  await expect(page.getByLabel("Mevcut şifre", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Şifreleri göster").check();
  await expect(page.getByLabel("Yeni şifre", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByLabel("Şifreleri göster").uncheck();
  await page.screenshot({
    path: "test-results/password-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Mevcut şifre", { exact: true }).fill(nextPassword);
  await page.getByLabel("Yeni şifre", { exact: true }).fill(password);
  await page.getByLabel("Yeni şifre (tekrar)", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Şifreyi değiştir", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Şifreniz değiştirildi");
});

test("five wrong current passwords are rate limited", async ({ request }) => {
  const csrf = await login(request);
  const data = {
    currentPassword: "incorrect",
    newPassword: "Blocked-change-test-85",
    confirmPassword: "Blocked-change-test-85",
  };
  for (let i = 0; i < 5; i++)
    expect((await post(request, "password", csrf, data)).status()).toBe(401);
  expect(
    (
      await post(request, "password", csrf, {
        ...data,
        currentPassword: password,
      })
    ).status(),
  ).toBe(429);
});

test("five wrong logins are rate limited", async ({ request }) => {
  for (let i = 0; i < 5; i++)
    expect(
      (
        await request.post("/api/admin/login", {
          headers: { origin },
          data: { password: "incorrect" },
        })
      ).status(),
    ).toBe(401);
  expect(
    (
      await request.post("/api/admin/login", {
        headers: { origin },
        data: { password },
      })
    ).status(),
  ).toBe(429);
});
