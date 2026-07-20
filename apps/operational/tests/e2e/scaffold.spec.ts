import { expect, test } from "@playwright/test";

test("scaffold page identifies Operational vNext without a database", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/CMTCommand Operational vNext/);
  await expect(
    page.getByRole("heading", { name: "Operational vNext Scaffold" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Production authentication remains disabled until a managed provider is selected.",
    ),
  ).toBeVisible();
});

test("protected operations redirect unauthenticated users to sign-in", async ({
  page,
}) => {
  await page.goto("/app");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Development and test identity")).toBeVisible();
});

test("sign-in remains usable at 390px without overflow or browser errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");

  const continueButton = page.getByRole("button", {
    name: "Continue to protected app",
  });
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(continueButton).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      continueButton.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth;
      }),
    )
    .toBe(true);
  expect(browserErrors).toEqual([]);
});

test("development session cookie is HttpOnly and resolves a database-backed identity", async ({
  context,
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue to protected app" }).click();

  await expect(page.getByRole("heading", { name: "Alpha Engineering" })).toBeVisible();
  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "cmtcommand-operational-session",
  );
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  expect(sessionCookie?.value).not.toContain("organization_admin");
});

test("liveness endpoint returns a stable machine-readable response", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toMatch(/no-store/);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "cmtcommand-operational",
  });
});

test("readiness endpoint reports PostgreSQL ready", async ({
  request,
}) => {
  const response = await request.get("/api/ready");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toMatch(/no-store/);
  await expect(response.json()).resolves.toEqual({
    status: "ready",
    service: "cmtcommand-operational",
    checks: {
      database: "ok",
    },
  });
});
