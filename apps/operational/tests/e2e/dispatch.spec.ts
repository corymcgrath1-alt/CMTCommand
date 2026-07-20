import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("operations manager and dispatcher complete a persisted workflow with stale-version recovery", async ({ browser, page }) => {
  await signIn(page, "alpha-operations");
  await page.getByRole("link", { name: "Projects" }).click();
  const createProject = page.locator("details").filter({ hasText: "Create project" });
  await createProject.locator("summary").click();
  await createProject.getByLabel("Source ID").fill("e2e-project-waterfront");
  await createProject.getByLabel("Project number").fill("E2E-100");
  await createProject.getByLabel("Project name").fill("E2E Waterfront Annex");
  await createProject.getByLabel("Address").fill("101 Waterfront Drive, Alexandria, VA");
  await createProject.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "E2E Waterfront Annex" })).toBeVisible();

  await page.getByRole("link", { name: "Work Orders" }).click();
  const createWorkOrder = page.locator("details").filter({ hasText: "Create work order" });
  await createWorkOrder.locator("summary").click();
  await createWorkOrder
    .getByLabel("Project")
    .selectOption({ label: "E2E-100 — E2E Waterfront Annex" });
  await createWorkOrder.getByLabel("Service type").selectOption({ label: "Concrete placement inspection" });
  await createWorkOrder.getByLabel("Source ID").fill("e2e-work-order-100");
  await createWorkOrder.getByLabel("Work-order number").fill("WO-E2E-100");
  await createWorkOrder.getByLabel("Job site").fill("E2E Waterfront Annex");
  await createWorkOrder.getByLabel("Start (ISO with offset)").fill("2026-07-21T08:00:00-04:00");
  await createWorkOrder.getByLabel("End (ISO with offset)").fill("2026-07-21T12:00:00-04:00");
  await createWorkOrder.getByLabel("Dispatch instructions").fill("Check in at the north gate.");
  await createWorkOrder.getByRole("button", { name: "Create draft work order" }).click();
  const workOrderCard = page.getByRole("article").filter({ hasText: "WO-E2E-100" });
  await expect(workOrderCard.getByText("draft", { exact: true })).toBeVisible();
  await workOrderCard.getByRole("button", { name: "Mark ready for dispatch" }).click();

  const dispatcherContext = await browser.newContext();
  const dispatcherPage = await dispatcherContext.newPage();
  await signIn(dispatcherPage, "alpha-dispatcher");
  await dispatcherPage.goto("/app/dispatch");
  const readyCard = dispatcherPage.getByRole("article").filter({ hasText: "WO-E2E-100" });
  await readyCard.getByRole("button", { name: "Create unassigned schedule" }).click();
  let assignmentCard = dispatcherPage.getByRole("article").filter({ hasText: "WO-E2E-100" });
  await expect(assignmentCard.getByText("unassigned", { exact: true })).toBeVisible();
  const primaryForm = assignmentCard
    .locator("details")
    .filter({ hasText: "Assign primary" });
  await primaryForm.locator("summary").click();
  await primaryForm.getByLabel("Technician").selectOption({ label: "Jordan Rivera" });
  await primaryForm.getByRole("button", { name: "Save primary" }).click();
  assignmentCard = dispatcherPage.getByRole("article").filter({ hasText: "WO-E2E-100" });
  await expect(assignmentCard.getByText("assigned", { exact: true })).toBeVisible();

  const boardResponse = await dispatcherPage.request.get("/api/dispatch/assignments");
  expect(boardResponse.status()).toBe(200);
  const board = await boardResponse.json();
  const item = board.values.find((value: { workOrder: { workOrderNumber: string } }) => value.workOrder.workOrderNumber === "WO-E2E-100");
  expect(item).toBeTruthy();
  const firstTransition = await dispatcherPage.request.post(`/api/dispatch/assignments/${item.assignment.id}/transition`, {
    data: { expectedVersion: item.assignment.version, toStatus: "acknowledged" },
  });
  expect(firstTransition.status()).toBe(200);
  const staleTransition = await dispatcherPage.request.post(`/api/dispatch/assignments/${item.assignment.id}/transition`, {
    data: { expectedVersion: item.assignment.version, toStatus: "in_progress" },
  });
  expect(staleTransition.status()).toBe(409);
  await expect(staleTransition.json()).resolves.toMatchObject({ status: "stale_update" });
  await dispatcherPage.goto("/app/dispatch?result=stale_update");
  await expect(dispatcherPage.getByText(/Refresh and try again with the latest version/)).toBeVisible();

  const refreshedBoard = await (await dispatcherPage.request.get("/api/dispatch/assignments")).json();
  const acknowledged = refreshedBoard.values.find((value: { assignment: { id: string } }) => value.assignment.id === item.assignment.id);
  const started = await dispatcherPage.request.post(`/api/dispatch/assignments/${item.assignment.id}/transition`, { data: { expectedVersion: acknowledged.assignment.version, toStatus: "in_progress" } });
  expect(started.status()).toBe(200);
  const startedBody = await started.json();
  const completed = await dispatcherPage.request.post(`/api/dispatch/assignments/${item.assignment.id}/transition`, { data: { expectedVersion: startedBody.value.version, toStatus: "completed" } });
  expect(completed.status()).toBe(200);
  await dispatcherPage.reload();
  assignmentCard = dispatcherPage.getByRole("article").filter({ hasText: "WO-E2E-100" });
  await expect(assignmentCard.getByText("completed", { exact: true })).toBeVisible();
  await dispatcherContext.close();
});

test("dispatcher is restricted to Alexandria and viewer and reviewer remain read-only", async ({ browser }) => {
  const dispatcherContext = await browser.newContext();
  const dispatcher = await dispatcherContext.newPage();
  await signIn(dispatcher, "alpha-dispatcher");
  await dispatcher.goto("/app/dispatch");
  await expect(dispatcher.getByLabel("Office").locator("option")).toHaveCount(2);
  await expect(dispatcher.getByLabel("Office").locator("option").nth(1)).toHaveText("ALX");
  await expect(dispatcher.getByText("Richmond", { exact: true })).toHaveCount(0);
  await dispatcherContext.close();

  for (const subject of ["alpha-viewer", "alpha-reviewer"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, subject);
    await page.goto("/app/dispatch");
    await expect(page.getByRole("button", { name: /Save primary|Add support|completed|cancelled/ })).toHaveCount(0);
    const response = await page.request.post("/api/dispatch/assignments/90000000-0000-4000-8000-000000000001/transition", { data: { expectedVersion: 1, toStatus: "cancelled", reason: "Unauthorized role" } });
    expect(response.status()).toBe(403);
    await context.close();
  }
});

test("linked field technician sees and acknowledges only their own persisted assignment", async ({ page }) => {
  await signIn(page, "alpha-technician");
  await expect(page.getByRole("link", { name: "My Assignments" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dispatch", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "My Assignments" }).click();
  await expect(page.getByText("Alpha Waterfront Renovation")).toBeVisible();
  await expect(page.getByText("Beta Laboratory Expansion")).toHaveCount(0);
  await page.getByRole("button", { name: "Acknowledge assignment" }).click();
  await expect(page.locator(".status-chip").filter({ hasText: "acknowledged" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".status-chip").filter({ hasText: "acknowledged" })).toBeVisible();
  const ownApi = await page.request.get("/api/my-assignments");
  expect(ownApi.status()).toBe(200);
  const ownBody = await ownApi.json();
  expect(ownBody.values).toHaveLength(1);
  expect(ownBody.values[0].assignment.id).toBe("90000000-0000-4000-8000-000000000001");
  const betaCrafted = await page.request.get("/api/projects/60000000-0000-4000-8000-000000000002");
  expect(betaCrafted.status()).toBe(403);
});

test("operational pages remain usable at 390px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "alpha-technician");
  await page.goto("/app/my-assignments");
  await expect(page.getByRole("heading", { name: "My Assignments" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

async function signIn(page: Page, subject: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Allowed identity subject").selectOption(subject);
  await page.getByRole("button", { name: "Continue to protected app" }).click();
  await expect(page).toHaveURL(/\/app/);
}
