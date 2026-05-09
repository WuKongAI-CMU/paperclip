import { z } from "zod";
import {
  COMPANY_STATUSES,
  MAX_COMPANY_ATTACHMENT_MAX_BYTES,
} from "../constants.js";

const logoAssetIdSchema = z.string().uuid().nullable().optional();
const brandColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional();
const feedbackDataSharingTermsVersionSchema = z.string().min(1).nullable().optional();
const attachmentMaxBytesSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_COMPANY_ATTACHMENT_MAX_BYTES);

export const createCompanySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
  attachmentMaxBytes: attachmentMaxBytesSchema.optional(),
});

export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    feedbackDataSharingEnabled: z.boolean().optional(),
    feedbackDataSharingTermsVersion: feedbackDataSharingTermsVersionSchema,
    brandColor: brandColorSchema,
    logoAssetId: logoAssetIdSchema,
  })
  .strict();

export type UpdateCompany = z.infer<typeof updateCompanySchema>;

export const updateCompanyGovernanceSchema = z
  .object({
    status: z.enum(COMPANY_STATUSES).optional(),
    budgetMonthlyCents: z.number().int().nonnegative().optional(),
    attachmentMaxBytes: attachmentMaxBytesSchema.optional(),
    requireBoardApprovalForNewAgents: z.boolean().optional(),
  })
  .strict();

export type UpdateCompanyGovernance = z.infer<typeof updateCompanyGovernanceSchema>;

export const updateCompanyBrandingSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    brandColor: brandColorSchema,
    logoAssetId: logoAssetIdSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined
      || value.description !== undefined
      || value.brandColor !== undefined
      || value.logoAssetId !== undefined,
    "At least one branding field must be provided",
  );

export type UpdateCompanyBranding = z.infer<typeof updateCompanyBrandingSchema>;
