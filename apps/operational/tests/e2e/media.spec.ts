import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const alphaOfficeId = "20000000-0000-4000-8000-000000000001";
const alphaConcreteServiceTypeId = "50000000-0000-4000-8000-000000000001";
const alphaTechnicianId = "70000000-0000-4000-8000-000000000001";
const largeJpeg = deterministicJpeg(3 * 1024 * 1024);
const objectStorageEndpoint = (
  process.env.OBJECT_STORAGE_ENDPOINT ?? "http://127.0.0.1:59000"
).replace(/\/+$/, "");

test.describe.configure({ mode: "serial" });

test("field technician uploads large private assignment media through My Assignments", async ({ browser }, testInfo) => {
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, "alpha-operations");
  const assignment = await createFreshAssignedAssignment(admin);
  await adminContext.close();

  const fieldContext = await browser.newContext();
  const field = await fieldContext.newPage();
  await signIn(field, "alpha-technician");
  await field.goto("/app/my-assignments");
  await expect(field.getByRole("heading", { name: "My Assignments" })).toBeVisible();

  await field
    .locator(`input[id="media-file-${assignment.id}"]`)
    .setInputFiles({
      name: "large-ticket.jpg",
      mimeType: "image/jpeg",
      buffer: largeJpeg,
    });

  await expect(field.getByText("Upload complete.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(field.locator("progress.media-upload-progress").first())
    .toHaveAttribute("value", "100");
  await expect(field.locator(".media-list img").first()).toBeVisible();
  await expect(field.getByText("3.0 MB")).toBeVisible();
  await expect(field.locator(".media-list dd").filter({ hasText: "general photo" }).first())
    .toBeVisible();

  await field.reload();
  await expect(field.getByText("3.0 MB")).toBeVisible();
  await expect(field.locator(".media-list img").first()).toBeVisible();

  const list = await field.request.get(
    `/api/media/assignments/${assignment.id}/assets`,
  );
  expect(list.status()).toBe(200);
  const listBody = await list.json();
  expect(listBody.values).toHaveLength(1);
  const mediaAssetId = listBody.values[0].id;
  expect(JSON.stringify(listBody)).not.toMatch(/storageKey|storageBucket|token/i);

  const previewAccess = await field.request.get(
    `/api/media/assets/${mediaAssetId}/access?variant=preview`,
  );
  expect(previewAccess.status()).toBe(200);
  const previewBody = await previewAccess.json();
  const preview = await field.request.get(previewBody.access.url);
  expect(preview.status()).toBe(200);
  expect(preview.headers()["cache-control"]).toContain("private");
  expect(preview.headers()["content-type"]).toContain("image/svg+xml");

  const oversizedPath = testInfo.outputPath("oversized.jpg");
  await writeFile(oversizedPath, Buffer.alloc(50 * 1024 * 1024 + 1, 0xff));
  await field
    .locator(`input[id="media-file-${assignment.id}"]`)
    .setInputFiles(oversizedPath);
  await expect(field.getByText("File is too large.")).toBeVisible();

  await field
    .locator(`input[id="media-file-${assignment.id}"]`)
    .setInputFiles({
      name: "disguised.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("MZ not really a jpeg"),
    });
  await expect(field.getByText(/media type could not be verified/i)).toBeVisible({
    timeout: 20_000,
  });

  await field.route(`${objectStorageEndpoint}/**`, (route) =>
    route.abort("connectionrefused"),
  );
  await field
    .locator(`input[id="media-file-${assignment.id}"]`)
    .setInputFiles({
      name: "storage-down.jpg",
      mimeType: "image/jpeg",
      buffer: deterministicJpeg(4096),
    });
  await expect(field.getByText("Upload storage is unavailable.")).toBeVisible({
    timeout: 15_000,
  });
  await field.unroute(`${objectStorageEndpoint}/**`);

  await field.setViewportSize({ width: 390, height: 844 });
  await expect(field.getByRole("heading", { name: "My Assignments" })).toBeVisible();
  const overflow = await field.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await fieldContext.close();

  const dispatcherContext = await browser.newContext();
  const dispatcher = await dispatcherContext.newPage();
  await signIn(dispatcher, "alpha-dispatcher");
  await dispatcher.goto("/app/dispatch");
  await expect(dispatcher.getByText("3.0 MB")).toBeVisible();
  await expect(dispatcher.locator(".media-list dd").filter({ hasText: "general photo" }).first())
    .toBeVisible();
  await dispatcherContext.close();

  const viewerContext = await browser.newContext();
  const viewer = await viewerContext.newPage();
  await signIn(viewer, "alpha-viewer");
  expect(
    (await viewer.request.get(`/api/media/assignments/${assignment.id}/assets`))
      .status(),
  ).toBe(403);
  expect(
    (await viewer.request.get(
      `/api/media/assets/${mediaAssetId}/access?variant=original`,
    )).status(),
  ).toBe(403);
  await viewerContext.close();

  const betaContext = await browser.newContext();
  const beta = await betaContext.newPage();
  await signIn(beta, "beta-admin");
  expect(
    (await beta.request.get(
      `/api/media/assets/${mediaAssetId}/access?variant=original`,
    )).status(),
  ).toBe(404);
  await betaContext.close();
});

async function createFreshAssignedAssignment(page: Page) {
  const key = randomUUID();
  const project = await page.request.post("/api/projects", {
    data: {
      officeId: alphaOfficeId,
      sourceSystem: "phase5g.e2e",
      sourceProjectId: `project-${key}`,
      projectNumber: `MED-${key.slice(0, 8)}`,
      name: `Media project ${key.slice(0, 8)}`,
    },
  });
  expect(project.status()).toBe(201);
  const projectBody = await project.json();

  const workOrder = await page.request.post("/api/work-orders", {
    data: {
      officeId: alphaOfficeId,
      projectId: projectBody.value.id,
      serviceTypeId: alphaConcreteServiceTypeId,
      sourceSystem: "phase5g.e2e",
      sourceWorkOrderId: `work-order-${key}`,
      workOrderNumber: `MED-WO-${key.slice(0, 8)}`,
      jobSiteName: "Phase 5G media site",
      scheduledStartAt: "2026-08-01T08:00:00-04:00",
      scheduledEndAt: "2026-08-01T10:00:00-04:00",
    },
  });
  expect(workOrder.status()).toBe(201);
  const workOrderBody = await workOrder.json();

  const ready = await page.request.post(
    `/api/work-orders/${workOrderBody.value.id}/transition`,
    {
      data: {
        expectedVersion: workOrderBody.value.version,
        toStatus: "ready_for_dispatch",
      },
    },
  );
  expect(ready.status()).toBe(200);

  const assignment = await page.request.post("/api/dispatch/assignments", {
    data: {
      officeId: alphaOfficeId,
      workOrderId: workOrderBody.value.id,
      sourceSystem: "phase5g.e2e",
      sourceAssignmentId: `assignment-${key}`,
      assignmentStartAt: "2026-08-01T08:00:00-04:00",
      assignmentEndAt: "2026-08-01T10:00:00-04:00",
    },
  });
  expect(assignment.status()).toBe(201);
  const assignmentBody = await assignment.json();

  const primary = await page.request.post(
    `/api/dispatch/assignments/${assignmentBody.value.id}/primary`,
    {
      data: {
        technicianId: alphaTechnicianId,
        expectedVersion: assignmentBody.value.version,
      },
    },
  );
  expect(primary.status()).toBe(200);
  return (await primary.json()).value;
}

async function signIn(page: Page, subject: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Allowed identity subject").selectOption(subject);
  await page.getByRole("button", { name: "Continue to protected app" }).click();
  await expect(page).toHaveURL(/\/app/);
}

function deterministicJpeg(byteSize: number): Buffer {
  const header = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    0x04, 0x00, 0x06, 0x00,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11,
    0x00,
  ]);
  const end = Buffer.from([0xff, 0xd9]);
  if (byteSize <= header.length + end.length) {
    throw new Error("JPEG fixture size is too small.");
  }
  return Buffer.concat([
    header,
    Buffer.alloc(byteSize - header.length - end.length, 0),
    end,
  ]);
}
