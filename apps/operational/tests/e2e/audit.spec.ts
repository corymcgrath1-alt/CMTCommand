import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const alphaOfficeId = "20000000-0000-4000-8000-000000000001";
const richmondOfficeId = "20000000-0000-4000-8000-000000000002";
const betaOfficeId = "20000000-0000-4000-8000-000000000003";

test.describe.configure({ mode: "serial" });

test("admin persists and reads membership and office-access audit history", async ({ page }) => {
  await signIn(page, "alpha-admin");
  await page.goto("/app/admin/members");
  const suffix = randomUUID();
  const preparation = page.getByRole("region", { name: "Prepare a membership" });
  await preparation.getByLabel("Display name").fill("Audit Prepared User");
  await preparation.getByLabel("Email").fill(`audit-${suffix}@example.test`);
  await preparation.getByLabel("Role").selectOption("dispatcher");
  await preparation.locator(`input[name="officeIds"][value="${alphaOfficeId}"]`).check();
  await preparation.getByRole("button", { name: "Prepare membership" }).click();
  await expect(page.getByRole("status")).toHaveText("The membership change was applied.");

  await page.goto("/app/audit");
  await expect(page.getByRole("heading", { name: "Audit history" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Membership Prepared" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Office Access Assigned" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Membership Prepared" })).toBeVisible();

  const response = await page.request.get("/api/audit?category=membership");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.values.some((event: { action: string }) => event.action === "membership.prepared"))
    .toBe(true);
});

test("restricted operations manager sees only authorized operational history and correlation filters", async ({ browser }) => {
  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await signIn(manager, "alpha-operations");
  const managerProject = await createProject(manager, alphaOfficeId, "manager-audit");
  expect(managerProject.response.status()).toBe(201);
  expect(managerProject.response.headers()["x-request-id"]).toBe(managerProject.body.requestId);
  expect(managerProject.body.mutation.requestId).toBe(managerProject.body.requestId);

  const byRequest = await manager.request.get(
    `/api/audit?requestId=${managerProject.body.mutation.requestId}`,
  );
  expect(byRequest.status()).toBe(200);
  await expect(byRequest.json()).resolves.toMatchObject({
    status: "ok",
    values: [{
      action: "project.created",
      requestId: managerProject.body.mutation.requestId,
      correlationId: managerProject.body.mutation.correlationId,
    }],
  });
  const byCorrelation = await manager.request.get(
    `/api/audit?correlationId=${managerProject.body.mutation.correlationId}`,
  );
  expect(byCorrelation.status()).toBe(200);
  expect((await byCorrelation.json()).values).toHaveLength(1);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, "alpha-admin");
  const richmondProject = await createProject(admin, richmondOfficeId, "richmond-audit");
  expect(richmondProject.response.status()).toBe(201);

  const visible = await manager.request.get("/api/audit?category=project");
  expect(visible.status()).toBe(200);
  const visibleBody = await visible.json();
  expect(visibleBody.values.map((event: { targetId: string }) => event.targetId))
    .toContain(managerProject.body.value.id);
  expect(visibleBody.values.map((event: { targetId: string }) => event.targetId))
    .not.toContain(richmondProject.body.value.id);
  expect((await manager.request.get(`/api/audit?officeId=${richmondOfficeId}`)).status())
    .toBe(404);
  expect((await manager.request.get("/api/audit?category=membership")).status()).toBe(403);

  await manager.goto("/app/audit");
  await expect(manager.getByRole("heading", { name: "Project Created" }).first())
    .toBeVisible();
  await expect(manager.getByText("Richmond", { exact: true })).toHaveCount(0);
  await adminContext.close();
  await managerContext.close();
});

test("tenant filters cannot expose Beta audit history to Alpha", async ({ browser }) => {
  const betaContext = await browser.newContext();
  const beta = await betaContext.newPage();
  await signIn(beta, "beta-admin");
  const betaProject = await createProject(beta, betaOfficeId, "beta-audit");
  expect(betaProject.response.status()).toBe(201);

  const alphaContext = await browser.newContext();
  const alpha = await alphaContext.newPage();
  await signIn(alpha, "alpha-admin");
  const crafted = await alpha.request.get(
    `/api/audit?targetType=project&targetId=${betaProject.body.value.id}`,
  );
  expect(crafted.status()).toBe(200);
  expect((await crafted.json()).values).toEqual([]);
  expect((await alpha.request.get(`/api/audit?officeId=${betaOfficeId}`)).status()).toBe(200);
  expect((await (await alpha.request.get(`/api/audit?officeId=${betaOfficeId}`)).json()).values)
    .toEqual([]);
  await alphaContext.close();
  await betaContext.close();
});

test("dispatcher, viewer, and field technician receive safe general-audit denials", async ({ browser }) => {
  for (const subject of ["alpha-dispatcher", "alpha-viewer", "alpha-technician"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, subject);
    const response = await page.request.get("/api/audit");
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({ status: "forbidden", reason: "missing_permission" });
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(JSON.stringify(body)).not.toMatch(/failed query|stack|node_modules/i);
    await page.goto("/app/audit");
    await expect(page.getByRole("heading", { name: "Audit history access unavailable" }))
      .toBeVisible();
    await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0);
    await context.close();
  }
});

test("audit filters persist and the 390px view has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "alpha-admin");
  const project = await createProject(page, alphaOfficeId, "mobile-audit");
  expect(project.response.status()).toBe(201);
  await page.goto("/app/audit");
  await page.getByLabel("Category").selectOption("project");
  await page.getByLabel("Target type").selectOption("project");
  await page.getByLabel("Target ID").fill(project.body.value.id);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=project/);
  await expect(page).toHaveURL(/targetType=project/);
  await expect(page.getByLabel("Category")).toHaveValue("project");
  await expect(page.getByLabel("Target ID")).toHaveValue(project.body.value.id);
  await expect(page.getByRole("heading", { name: "Project Created" })).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )).toBe(true);
  expect(await page.locator("body").innerText()).not.toMatch(/failed query|stack trace/i);
});

async function createProject(page: Page, officeId: string, key: string) {
  const sourceId = `${key}-${randomUUID()}`;
  const response = await page.request.post("/api/projects", {
    data: {
      officeId,
      sourceSystem: "phase5f.e2e",
      sourceProjectId: sourceId,
      projectNumber: `AUD-${sourceId.slice(-12)}`,
      name: `Audit project ${key}`,
    },
  });
  return { response, body: await response.json() };
}

async function signIn(page: Page, subject: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Allowed identity subject").selectOption(subject);
  await page.getByRole("button", { name: "Continue to protected app" }).click();
  await expect(page).toHaveURL(/\/app/);
}
