import { Buffer } from "node:buffer";

export const allowedDetectedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedDetectedMediaType =
  (typeof allowedDetectedMediaTypes)[number];

export const allowedDeclaredMediaTypes = [
  ...allowedDetectedMediaTypes,
  "image/jpg",
] as const;

const maxImageDimension = 20_000;
const maxImagePixels = 60_000_000;

export type MediaInspection = {
  detectedMediaType: AllowedDetectedMediaType | null;
  width: number | null;
  height: number | null;
};

export function detectMediaType(body: Buffer): AllowedDetectedMediaType | null {
  if (
    body.length >= 3 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47 &&
    body[4] === 0x0d &&
    body[5] === 0x0a &&
    body[6] === 0x1a &&
    body[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    body.length >= 6 &&
    (body.subarray(0, 6).toString("ascii") === "GIF87a" ||
      body.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "image/gif";
  }

  if (
    body.length >= 12 &&
    body.subarray(0, 4).toString("ascii") === "RIFF" &&
    body.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (body.length >= 5 && body.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }

  return null;
}

export function inspectMedia(body: Buffer): MediaInspection {
  const detectedMediaType = detectMediaType(body);
  const dimensions = detectedMediaType ? detectDimensions(body, detectedMediaType) : null;
  return {
    detectedMediaType,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
}

export function mediaSafetyIssues(inspection: MediaInspection): string[] {
  const issues: string[] = [];
  if (!inspection.detectedMediaType?.startsWith("image/")) return issues;
  if (inspection.width === null || inspection.height === null) return issues;
  if (
    inspection.width <= 0 ||
    inspection.height <= 0 ||
    inspection.width > maxImageDimension ||
    inspection.height > maxImageDimension ||
    inspection.width * inspection.height > maxImagePixels
  ) {
    issues.push("image dimensions exceed supported safety limits");
  }
  return issues;
}

export function declaredTypeCompatible(
  declaredMediaType: string,
  detectedMediaType: AllowedDetectedMediaType,
): boolean {
  const normalized = declaredMediaType.toLowerCase();
  if (normalized === detectedMediaType) return true;
  if (detectedMediaType === "image/jpeg" && normalized === "image/jpg") return true;
  return false;
}

function detectDimensions(
  body: Buffer,
  detectedMediaType: AllowedDetectedMediaType,
): { width: number; height: number } | null {
  if (detectedMediaType === "image/png") return pngDimensions(body);
  if (detectedMediaType === "image/gif") return gifDimensions(body);
  if (detectedMediaType === "image/jpeg") return jpegDimensions(body);
  if (detectedMediaType === "image/webp") return webpDimensions(body);
  return null;
}

function pngDimensions(body: Buffer): { width: number; height: number } | null {
  if (body.length < 24 || body.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }
  return {
    width: body.readUInt32BE(16),
    height: body.readUInt32BE(20),
  };
}

function gifDimensions(body: Buffer): { width: number; height: number } | null {
  if (body.length < 10) return null;
  return {
    width: body.readUInt16LE(6),
    height: body.readUInt16LE(8),
  };
}

function jpegDimensions(body: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 4 < body.length) {
    if (body[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (body[offset] === 0xff) offset += 1;
    const marker = body[offset];
    offset += 1;
    if (marker === undefined) return null;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > body.length) return null;
    const segmentLength = body.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > body.length) return null;
    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: body.readUInt16BE(offset + 3),
        width: body.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function webpDimensions(body: Buffer): { width: number; height: number } | null {
  const chunk = body.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && body.length >= 30) {
    return {
      width: 1 + body.readUIntLE(24, 3),
      height: 1 + body.readUIntLE(27, 3),
    };
  }
  return null;
}
