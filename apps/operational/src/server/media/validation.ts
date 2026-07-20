import { z } from "zod";
import { mediaAssetCategoryValues } from "@/server/db/schema";
import { uuidInputSchema } from "@/server/tenancy/validation";
import { allowedDeclaredMediaTypes } from "./media-type";

export const MAX_MEDIA_UPLOAD_BYTES = 50 * 1024 * 1024;
export const READ_VARIANTS = ["original", "preview", "thumbnail"] as const;

const mediaTypeInputSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/)
  .max(120)
  .refine(
    (value) => (allowedDeclaredMediaTypes as readonly string[]).includes(value),
    "unsupported media type",
  );

const sha256InputSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{64}$/);

export const beginMediaUploadInputSchema = z.object({
  assignmentId: uuidInputSchema,
  category: z.enum(mediaAssetCategoryValues),
  originalFilename: z.string().trim().min(1).max(180),
  declaredMediaType: mediaTypeInputSchema,
  byteSize: z.coerce.number().int().min(1).max(MAX_MEDIA_UPLOAD_BYTES),
  sha256: sha256InputSchema,
  idempotencyKey: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._:-]{8,120}$/),
});

export const uploadSessionIdInputSchema = uuidInputSchema;
export const mediaAssetIdInputSchema = uuidInputSchema;
export const mediaReadVariantInputSchema = z.enum(READ_VARIANTS).default("original");

export type BeginMediaUploadInput = z.infer<
  typeof beginMediaUploadInputSchema
>;
export type MediaReadVariant = z.infer<typeof mediaReadVariantInputSchema>;
