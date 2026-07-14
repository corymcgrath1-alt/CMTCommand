import { expect, test } from "@playwright/test";

test("scaffold page identifies Operational vNext without a database", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/CMTCommand Operational vNext/);
  await expect(
    page.getByRole("heading", { name: "Operational vNext Scaffold" }),
  ).toBeVisible();
  await expect(page.getByText("No authentication or user accounts.")).toBeVisible();
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

test("readiness endpoint reports controlled 503 when PostgreSQL is not configured", async ({
  request,
}) => {
  const response = await request.get("/api/ready");

  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toMatch(/no-store/);
  await expect(response.json()).resolves.toEqual({
    status: "not_ready",
    service: "cmtcommand-operational",
    reason: "database_not_configured",
    checks: {
      database: "not_configured",
    },
  });
});
