import { Buffer } from "node:buffer";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env/server";
import {
  assertObjectStorageCleanupAuthorized,
  getObjectStorageConfig,
  type LocalTestObjectStorageConfig,
} from "./config";

const safeStorageKeyPattern = /^[a-z0-9][a-z0-9._/-]{0,511}$/;
const serviceName = "s3";

export type StoredObjectReference = {
  provider: "local-test";
  bucket: string;
  key: string;
};

export type StoredObjectFacts = {
  byteSize: number;
  sha256: string;
  contentType: string;
  updatedAt: Date;
};

export type PutObjectInput = StoredObjectReference & {
  body: Buffer;
  contentType: string;
};

export interface PrivateObjectStorage {
  putObject(input: PutObjectInput): Promise<StoredObjectFacts>;
  getObject(reference: StoredObjectReference): Promise<Buffer>;
  headObject(reference: StoredObjectReference): Promise<StoredObjectFacts>;
}

export class ObjectStorageError extends Error {
  readonly code:
    | "storage_unconfigured"
    | "invalid_object_reference"
    | "object_not_found"
    | "storage_unavailable";

  constructor(code: ObjectStorageError["code"]) {
    super(code);
    this.name = "ObjectStorageError";
    this.code = code;
  }
}

export class LocalTestObjectStorage implements PrivateObjectStorage {
  constructor(private readonly config: LocalTestObjectStorageConfig) {}

  async putObject(input: PutObjectInput): Promise<StoredObjectFacts> {
    this.assertReference(input);
    await this.ensureBucket();

    const sha256 = sha256Hex(input.body);
    await this.signedFetch({
      method: "PUT",
      path: objectPath(input.bucket, input.key),
      headers: {
        "content-type": input.contentType,
        "x-amz-meta-sha256": sha256,
      },
      body: input.body,
      expectedStatuses: [200],
    });

    return {
      byteSize: input.body.byteLength,
      sha256,
      contentType: input.contentType,
      updatedAt: new Date(),
    };
  }

  async getObject(reference: StoredObjectReference): Promise<Buffer> {
    this.assertReference(reference);
    const response = await this.signedFetch({
      method: "GET",
      path: objectPath(reference.bucket, reference.key),
      expectedStatuses: [200],
      notFoundStatuses: [404],
    });

    return Buffer.from(await response.arrayBuffer());
  }

  async headObject(reference: StoredObjectReference): Promise<StoredObjectFacts> {
    this.assertReference(reference);
    const response = await this.signedFetch({
      method: "HEAD",
      path: objectPath(reference.bucket, reference.key),
      expectedStatuses: [200],
      notFoundStatuses: [404],
    });
    const byteSize = Number(response.headers.get("content-length") ?? "0");
    const sha256 = response.headers.get("x-amz-meta-sha256");
    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";

    if (!Number.isSafeInteger(byteSize) || byteSize < 0 || !sha256) {
      throw new ObjectStorageError("storage_unavailable");
    }

    return {
      byteSize,
      sha256,
      contentType,
      updatedAt: parseHttpDate(response.headers.get("last-modified")),
    };
  }

  async ensureBucket(): Promise<void> {
    const head = await this.signedFetch({
      method: "HEAD",
      path: bucketPath(this.config.bucket),
      expectedStatuses: [200, 404],
    });
    if (head.status === 200) return;

    await this.signedFetch({
      method: "PUT",
      path: bucketPath(this.config.bucket),
      expectedStatuses: [200],
    });
  }

  async getBucketPolicy(): Promise<string | null> {
    const response = await this.signedFetch({
      method: "GET",
      path: bucketPath(this.config.bucket),
      query: { policy: "" },
      expectedStatuses: [200, 404],
    });
    if (response.status === 404) return null;
    return response.text();
  }

  async listObjectKeys(): Promise<string[]> {
    const response = await this.signedFetch({
      method: "GET",
      path: bucketPath(this.config.bucket),
      query: { "list-type": "2" },
      expectedStatuses: [200, 404],
    });
    if (response.status === 404) return [];
    return parseS3Keys(await response.text());
  }

  async deleteObject(key: string): Promise<void> {
    this.assertReference({
      provider: "local-test",
      bucket: this.config.bucket,
      key,
    });
    await this.signedFetch({
      method: "DELETE",
      path: objectPath(this.config.bucket, key),
      expectedStatuses: [204, 404],
    });
  }

  async healthCheck(): Promise<void> {
    await this.ensureBucket();
    await this.signedFetch({
      method: "HEAD",
      path: bucketPath(this.config.bucket),
      expectedStatuses: [200],
    });
  }

  private async signedFetch(input: {
    method: string;
    path: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: Buffer;
    expectedStatuses: number[];
    notFoundStatuses?: number[];
  }): Promise<Response> {
    const body = input.body ?? Buffer.alloc(0);
    const payloadHash = sha256Hex(body);
    const endpoint = new URL(this.config.endpoint);
    endpoint.pathname = combineEndpointPath(endpoint.pathname, input.path);
    endpoint.search = canonicalQuery(input.query);

    const headers: Record<string, string> = {
      ...(input.headers ?? {}),
      host: endpoint.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate(new Date()),
    };
    const authorization = signRequest({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region,
      method: input.method,
      path: endpoint.pathname,
      query: endpoint.searchParams,
      headers,
      payloadHash,
    });

    const requestBody = input.method === "GET" || input.method === "HEAD"
      ? undefined
      : toArrayBuffer(body);
    const response = await fetch(endpoint, {
      method: input.method,
      headers: {
        ...headers,
        authorization,
      },
      body: requestBody,
    });

    if (input.expectedStatuses.includes(response.status)) return response;
    if (input.notFoundStatuses?.includes(response.status)) {
      throw new ObjectStorageError("object_not_found");
    }
    throw new ObjectStorageError("storage_unavailable");
  }

  private assertReference(reference: StoredObjectReference): void {
    if (!isValidObjectReference(reference, this.config.bucket)) {
      throw new ObjectStorageError("invalid_object_reference");
    }
  }
}

export function createObjectStorage(): PrivateObjectStorage {
  const config = getObjectStorageConfig();

  if (config.mode === "disabled") {
    throw new ObjectStorageError("storage_unconfigured");
  }

  return new LocalTestObjectStorage(config);
}

export async function resetLocalTestObjectStorage(
  input: Record<string, string | undefined> = process.env,
): Promise<void> {
  const config = getObjectStorageConfig(input);
  if (config.mode === "disabled") return;

  assertObjectStorageCleanupAuthorized(config, input);
  const storage = new LocalTestObjectStorage(config);
  await storage.ensureBucket();
  const keys = await storage.listObjectKeys();
  await Promise.all(keys.map((key) => storage.deleteObject(key)));
}

export function createPresignedPutObjectUrl(input: {
  reference: StoredObjectReference;
  contentType: string;
  sha256: string;
  expiresAt: Date;
}): string {
  const config = getObjectStorageConfig();
  if (config.mode === "disabled") {
    throw new ObjectStorageError("storage_unconfigured");
  }
  if (!isValidObjectReference(input.reference, config.bucket)) {
    throw new ObjectStorageError("invalid_object_reference");
  }

  const now = new Date();
  const expiresSeconds = Math.max(
    1,
    Math.min(604_800, Math.ceil((input.expiresAt.getTime() - now.getTime()) / 1000)),
  );
  const endpoint = new URL(config.endpoint);
  endpoint.pathname = combineEndpointPath(
    endpoint.pathname,
    objectPath(input.reference.bucket, input.reference.key),
  );

  const requestDate = amzDate(now);
  const dateStamp = requestDate.slice(0, 8);
  const credentialScope =
    `${dateStamp}/${config.region}/${serviceName}/aws4_request`;
  const signedHeaders = "content-type;host;x-amz-meta-sha256";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": requestDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalHeaders = [
    `content-type:${input.contentType}`,
    `host:${endpoint.host}`,
    `x-amz-meta-sha256:${input.sha256}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    "PUT",
    endpoint.pathname,
    canonicalQueryFromParams(query),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const signature = signString({
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    dateStamp,
    requestDate,
    credentialScope,
    canonicalRequest,
  });
  query.append("X-Amz-Signature", signature);
  endpoint.search = canonicalQueryFromParams(query);
  return endpoint.toString();
}

export type GrantKind = "upload" | "read";

export type StorageGrantPayload = {
  kind: GrantKind;
  subjectId: string;
  expiresAt: number;
  variant?: "original" | "preview" | "thumbnail";
};

export function createStorageGrantToken(payload: StorageGrantPayload): string {
  const secret = readGrantSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyStorageGrantToken(
  token: string | null,
  expected: Omit<StorageGrantPayload, "expiresAt">,
): StorageGrantPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const secret = readGrantSecret();
  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expectedSignature);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
    return null;
  }

  let parsed: StorageGrantPayload;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    parsed.kind !== expected.kind ||
    parsed.subjectId !== expected.subjectId ||
    (expected.variant && parsed.variant !== expected.variant) ||
    parsed.expiresAt < Date.now()
  ) {
    return null;
  }

  return parsed;
}

function readGrantSecret(): string {
  const env = getServerEnv();
  if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 32) {
    throw new ObjectStorageError("storage_unconfigured");
  }
  return env.AUTH_SESSION_SECRET;
}

function signRequest(input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  payloadHash: string;
}): string {
  const normalizedHeaders = normalizeHeaders(input.headers);
  const signedHeaders = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${normalizedHeaders[name]}\n`)
    .join("");
  const requestDate = normalizedHeaders["x-amz-date"];
  const dateStamp = requestDate.slice(0, 8);
  const credentialScope =
    `${dateStamp}/${input.region}/${serviceName}/aws4_request`;
  const canonicalRequest = [
    input.method,
    input.path,
    canonicalQueryFromParams(input.query),
    canonicalHeaders,
    signedHeaders.join(";"),
    input.payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    requestDate,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8")),
  ].join("\n");
  const signature = hmac(deriveSigningKey(
    input.secretAccessKey,
    dateStamp,
    input.region,
  ), stringToSign).toString("hex");

  return [
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders.join(";")}`,
    `Signature=${signature}`,
  ].join(", ");
}

function signString(input: {
  secretAccessKey: string;
  region: string;
  dateStamp: string;
  requestDate: string;
  credentialScope: string;
  canonicalRequest: string;
}): string {
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    input.requestDate,
    input.credentialScope,
    sha256Hex(Buffer.from(input.canonicalRequest, "utf8")),
  ].join("\n");
  return hmac(
    deriveSigningKey(input.secretAccessKey, input.dateStamp, input.region),
    stringToSign,
  ).toString("hex");
}

function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
): Buffer {
  return hmac(
    hmac(
      hmac(
        hmac(Buffer.from(`AWS4${secretAccessKey}`, "utf8"), dateStamp),
        region,
      ),
      serviceName,
    ),
    "aws4_request",
  );
}

function hmac(key: Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      value.trim().replace(/\s+/g, " "),
    ]),
  );
}

function sha256Hex(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

function toArrayBuffer(body: Buffer): ArrayBuffer {
  const copy = new ArrayBuffer(body.byteLength);
  new Uint8Array(copy).set(body);
  return copy;
}

function isValidObjectReference(
  reference: StoredObjectReference,
  bucket: string,
): boolean {
  return (
    reference.provider === "local-test" &&
    reference.bucket === bucket &&
    safeStorageKeyPattern.test(reference.key) &&
    !reference.key.split("/").includes("..")
  );
}

function objectPath(bucket: string, key: string): string {
  return `${bucketPath(bucket)}/${key.split("/").map(awsUriEncode).join("/")}`;
}

function bucketPath(bucket: string): string {
  return `/${awsUriEncode(bucket)}`;
}

function combineEndpointPath(endpointPath: string, requestPath: string): string {
  const base = endpointPath === "/" ? "" : endpointPath.replace(/\/+$/, "");
  return `${base}${requestPath}`;
}

function canonicalQuery(query: Record<string, string> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.append(key, value);
  }
  const canonical = canonicalQueryFromParams(params);
  return canonical ? `?${canonical}` : "";
}

function canonicalQueryFromParams(query: URLSearchParams): string {
  return [...query.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${awsUriEncode(key)}=${awsUriEncode(value)}`)
    .join("&");
}

function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function parseHttpDate(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseS3Keys(xml: string): string[] {
  return [...xml.matchAll(/<Key>(.*?)<\/Key>/g)].map((match) =>
    decodeXml(match[1] ?? ""),
  );
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}
