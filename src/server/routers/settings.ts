// src/server/routers/settings.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { assertRole, protectedProcedure, requireOrgMembership, router } from "../trpc";
import { recordAudit } from "../audit";
import { organizations, bookingPolicies, type OrganizationSettings } from "@/db/schema/organizations";

export const settingsRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

      const policy = await ctx.db.query.bookingPolicies.findFirst({
        where: eq(bookingPolicies.organizationId, input.organizationId),
      });

      return {
        organization: {
          name: org.name,
          description: org.description,
          phone: org.phone,
          email: org.email,
          address: org.address,
          city: org.city,
          timezone: org.timezone,
          currency: org.currency,
          settings: org.settings ?? {},
        },
        policy: policy
          ? {
              cancellationWindowHours: policy.cancellationWindowHours,
              rescheduleWindowHours: policy.rescheduleWindowHours,
              requireDeposit: policy.requireDeposit,
              autoConfirmBookings: policy.autoConfirmBookings,
              privacyNotice: policy.privacyNotice,
              bookingTerms: policy.bookingTerms,
            }
          : null,
      };
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        settings: z
          .object({
            slotInterval: z.number().int().min(5).max(120).optional(),
            minimumNoticeMinutes: z.number().int().min(0).max(720).optional(),
            maxBookingDaysAhead: z.number().int().min(1).max(365).optional(),
            isTemporarilyClosed: z.boolean().optional(),
            taxRatePercent: z.number().int().min(0).max(100).optional(),
            allowStaffSelection: z.boolean().optional(),
          })
          .optional(),
        policy: z
          .object({
            cancellationWindowHours: z.number().int().min(0).max(720).optional(),
            rescheduleWindowHours: z.number().int().min(0).max(720).optional(),
            autoConfirmBookings: z.boolean().optional(),
            requireDeposit: z.boolean().optional(),
            privacyNotice: z.string().max(2000).optional(),
            bookingTerms: z.string().max(2000).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await requireOrgMembership(ctx, input.organizationId);
      assertRole(membership.role, ["owner", "manager"]);

      const org = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

      await ctx.db.transaction(async (tx) => {
        if (input.settings) {
          const merged: OrganizationSettings = { ...(org.settings ?? {}), ...input.settings };
          await tx
            .update(organizations)
            .set({ settings: merged, updatedAt: new Date() })
            .where(eq(organizations.id, org.id));
        }

        if (input.policy) {
          const policy = await tx.query.bookingPolicies.findFirst({
            where: eq(bookingPolicies.organizationId, input.organizationId),
          });
          if (policy) {
            await tx
              .update(bookingPolicies)
              .set({
                cancellationWindowHours: input.policy.cancellationWindowHours ?? policy.cancellationWindowHours,
                rescheduleWindowHours: input.policy.rescheduleWindowHours ?? policy.rescheduleWindowHours,
                autoConfirmBookings: input.policy.autoConfirmBookings ?? policy.autoConfirmBookings,
                requireDeposit: input.policy.requireDeposit ?? policy.requireDeposit,
                privacyNotice: input.policy.privacyNotice ?? policy.privacyNotice,
                bookingTerms: input.policy.bookingTerms ?? policy.bookingTerms,
                updatedAt: new Date(),
              })
              .where(eq(bookingPolicies.id, policy.id));
          }
        }

        await recordAudit(tx, {
          organizationId: input.organizationId,
          actorId: ctx.userId,
          action: "settings.updated",
          entityType: "organization",
          entityId: org.id,
          meta: {
            settingsChanged: input.settings ? Object.keys(input.settings) : [],
            policyChanged: input.policy ? Object.keys(input.policy) : [],
          },
        });
      });

      return { ok: true as const };
    }),
});