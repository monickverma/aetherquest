import { z } from "zod";

import {
  ATTRIBUTE_KEYS,
  CADENCES,
  DIFFICULTY_KEYS,
} from "./game";

/**
 * Every request body crosses this boundary before it reaches the database.
 * Anything the client can influence is length-capped so a hostile payload
 * cannot bloat a row, and strings are trimmed so " " is not a valid title.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v.length <= 254, "That email address is too long.")
  .pipe(z.email("That does not look like an email address."));

export const passwordSchema = z
  .string()
  .min(8, "Your passphrase must be at least 8 characters.")
  .max(200, "Your passphrase must be under 200 characters.");

export const displayNameSchema = trimmed(40)
  .min(2, "Your name must be at least 2 characters.")
  .regex(
    /^[\p{L}\p{N} '._-]+$/u,
    "Use letters, numbers, spaces, apostrophes, dots, hyphens or underscores.",
  );

/** Free-form and never trusted, so it is validated against the runtime later. */
export const timezoneSchema = trimmed(64).optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  timezone: timezoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your passphrase.").max(200),
  timezone: timezoneSchema,
});

export const createQuestSchema = z.object({
  title: trimmed(120).min(1, "A quest needs a name."),
  notes: trimmed(500).optional().nullable(),
  attribute: z.enum(ATTRIBUTE_KEYS),
  difficulty: z.enum(DIFFICULTY_KEYS).default("standard"),
  cadence: z.enum(CADENCES).default("daily"),
});

export const updateQuestSchema = z
  .object({
    title: trimmed(120).min(1, "A quest needs a name.").optional(),
    notes: trimmed(500).nullable().optional(),
    attribute: z.enum(ATTRIBUTE_KEYS).optional(),
    difficulty: z.enum(DIFFICULTY_KEYS).optional(),
    cadence: z.enum(CADENCES).optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nothing to change.",
  });

export const equipSchema = z.object({
  slot: z.enum(["title", "sigil"]),
  /** null un-equips the slot. */
  itemId: z.string().trim().max(80).nullable(),
});

export const renameCharacterSchema = z.object({
  name: displayNameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateQuestInput = z.infer<typeof createQuestSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestSchema>;

/** Flattens a ZodError into a single readable sentence for the UI. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That request was not valid.";
}
