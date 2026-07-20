"use client";

/* eslint-disable @next/next/no-img-element */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

const maxMediaUploadBytes = 50 * 1024 * 1024;
const allowedMediaTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);
const categories = [
  "general_photo",
  "truck_ticket",
  "test_result",
  "observation",
  "other",
] as const;

type MediaAsset = {
  id: string;
  category: string;
  detectedMediaType: string;
  byteSize: number;
  status: string;
  derivatives: { derivativeType: "preview" | "thumbnail" }[];
};

type Notice = {
  tone: "success" | "error" | "status";
  message: string;
};

export function AssignmentMediaPanel({
  assignmentId,
  canUpload = true,
}: {
  assignmentId: string;
  canUpload?: boolean;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<(typeof categories)[number]>(
    "general_photo",
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const inputId = useMemo(() => `media-file-${assignmentId}`, [assignmentId]);

  const loadPreviewBlobs = useCallback(async (
    values: MediaAsset[],
    cancelled: boolean,
  ) => {
    const next: Record<string, string> = {};
    for (const asset of values) {
      if (!asset.derivatives.some((item) => item.derivativeType === "preview")) {
        continue;
      }
      const grant = await fetch(
        `/api/media/assets/${asset.id}/access?variant=preview`,
        { cache: "no-store" },
      );
      if (!grant.ok) continue;
      const grantBody = await grant.json();
      if (grantBody.status !== "ok" || typeof grantBody.access?.url !== "string") {
        continue;
      }
      next[asset.id] = grantBody.access.url;
    }
    if (!cancelled) {
      setPreviews(next);
    }
  }, []);

  const refreshAssets = useCallback(async (cancelled = false) => {
    const response = await fetch(`/api/media/assignments/${assignmentId}/assets`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = await response.json();
    if (cancelled || body.status !== "ok" || !Array.isArray(body.values)) return;
    setAssets(body.values);
    await loadPreviewBlobs(body.values, cancelled);
  }, [assignmentId, loadPreviewBlobs]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAssets(cancelled);
    return () => {
      cancelled = true;
    };
  }, [refreshAssets]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > maxMediaUploadBytes) {
      setNotice({ tone: "error", message: "File is too large." });
      return;
    }

    const declaredMediaType = (file.type || "application/octet-stream")
      .trim()
      .toLowerCase();
    if (!allowedMediaTypes.has(declaredMediaType)) {
      setNotice({ tone: "error", message: "Unsupported media type." });
      return;
    }

    setBusy(true);
    setProgress(0);
    setNotice({ tone: "status", message: "Preparing upload." });

    try {
      const body = await file.arrayBuffer();
      const sha256 = await digestSha256(body);
      const begin = await fetch(`/api/media/assignments/${assignmentId}/uploads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          originalFilename: file.name,
          declaredMediaType,
          byteSize: file.size,
          sha256,
          idempotencyKey: `field-${Date.now()}-${sha256.slice(0, 24)}`,
        }),
      });
      const beginBody = await begin.json();
      if (!begin.ok || !["created", "ok"].includes(beginBody.status)) {
        throw new Error(userFacingError(beginBody));
      }
      if (typeof beginBody.upload?.uploadUrl !== "string") {
        throw new Error("Upload session is no longer available.");
      }

      setNotice({ tone: "status", message: "Uploading 0%." });
      await uploadWithProgress(
        beginBody.upload.uploadUrl,
        file,
        beginBody.upload.requiredHeaders ?? {},
        (percent) => {
          setProgress(percent);
          setNotice({ tone: "status", message: `Uploading ${percent}%.` });
        },
      );

      setNotice({ tone: "status", message: "Verifying upload." });
      const complete = await fetch(
        `/api/media/uploads/${beginBody.upload.uploadSessionId}/complete`,
        { method: "POST" },
      );
      const completeBody = await complete.json();
      if (!complete.ok || completeBody.status !== "ok") {
        throw new Error(userFacingError(completeBody));
      }

      setProgress(100);
      setNotice({ tone: "success", message: "Upload complete." });
      await refreshAssets();
    } catch (error) {
      setProgress(null);
      setNotice({
        tone: "error",
        message: error instanceof Error
          ? error.message
          : "Upload could not be completed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="subpanel media-upload-panel">
      <div className="record-heading">
        <div>
          <h3>Assignment media</h3>
          <p className="muted">{assets.length} files</p>
        </div>
        {canUpload ? (
          <label
            className={`button button-small ${busy ? "button-secondary" : ""}`}
            htmlFor={inputId}
          >
            Add Photo
          </label>
        ) : null}
      </div>
      {canUpload ? (
        <div className="media-upload-controls">
          <label>
            Evidence category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as (typeof categories)[number])
              }
              disabled={busy}
            >
              {categories.map((value) => (
                <option key={value} value={value}>
                  {formatCategory(value)}
                </option>
              ))}
            </select>
          </label>
          <input
            id={inputId}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            disabled={busy}
            onChange={handleFileChange}
          />
        </div>
      ) : null}
      {notice ? (
        <p
          className={`notice ${notice.tone === "error" ? "notice-error" : "notice-success"}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}
      {progress !== null ? (
        <progress className="media-upload-progress" value={progress} max={100}>
          {progress}%
        </progress>
      ) : null}
      {assets.length > 0 ? (
        <ul className="media-list">
          {assets.map((asset) => (
            <li key={asset.id}>
              {previews[asset.id] ? (
                <img alt="" src={previews[asset.id]} />
              ) : (
                <div className="media-preview-placeholder" aria-hidden="true" />
              )}
              <dl className="detail-list">
                <div>
                  <dt>Category</dt>
                  <dd>{formatCategory(asset.category)}</dd>
                </div>
                <div>
                  <dt>Original size</dt>
                  <dd>{formatBytes(asset.byteSize)}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{asset.detectedMediaType}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{asset.status}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

async function digestSha256(body: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", body);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function uploadWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.timeout = 10_000;
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Upload storage is unavailable."));
    };
    request.onerror = () => reject(new Error("Upload storage is unavailable."));
    request.ontimeout = () => reject(new Error("Upload storage is unavailable."));
    request.send(file);
  });
}

function userFacingError(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "issues" in body &&
    Array.isArray(body.issues)
  ) {
    return body.issues.join(" ");
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    body.status === "persistence_error"
  ) {
    return "Upload storage is unavailable.";
  }
  return "Upload could not be completed.";
}

function formatCategory(value: string): string {
  return value.replaceAll("_", " ");
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}
